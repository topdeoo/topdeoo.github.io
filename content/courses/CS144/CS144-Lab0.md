---
title: Lab0 字节传输流
description: 实现一个 best effort 的字节传输流
tags:
  - Stanford
  - Network
date: 2023-02-20
lastmod: 2024-12-11
draft: false
---

前面的简单实践跳过，主要是需要熟悉 `HTTP` 报文的结构即可

**注意，在编写代码的过程中需要遵循 cs144 的标准**

![image-20230220220916776](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230220220916776.png)

实验准备

打开对应的 `docker` 容器后，执行以下步骤：

![image-20230220220954653](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230220220954653.png)

编译完成后，我们可以选择使用 `VS Code` 来连接此容器，并在 `VS Code` 中编写代码并运行。

> 但我在这里用的是 `Clion` 因为想试试看这个工程软件，`VS Code` 感觉在文件索引方面做的一般

# 实验过程

## `webget`

完成 `app/webget.cc` 中的 `get_URL` 函数

这里我们需要阅读 `libsponge/uitl/socket.hh` `libsponge/uitl/address.hh` 中对于 `TCPSocket`，`Socket` 与 `Address` 的定义及用法（也可以阅读官方文档[Sponge: Main Page (cs144.github.io)](https://cs144.github.io/doc/lab0/)）。

阅读完后，在文档中有着一个小型示例：

![image-20230223103124104](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230223103124104.png)

仿照这个示例，我们可以写出如下代码：

```cpp
TCPSocket socket = TCPSocket();
socket.connect(Address(host, "http"));
/* do something*/
```

这样连接成功后，我们就可以通过 `socket` 中的 `write` 方法来对服务器进行一系列数据传输，具体需要传输的数据可以参照本实验中的 `2.1 Fetch a Web Page` ：

```cpp
socket.write("GET " + path + " HTTP/1.1\r\nHost: " + host + "\r\nConnection: close\r\n\r\n");
```

注意到这里的换行为 `\r\n` 而非 `\n` ，并且在 `Connection: close\r\n` 最后，我们还需要添加一个 `\r\n` 代表着请求报的结束。

最后，我们只需要接收 `socket` 传输来的报文并监听是否到达 `eof` 即可。

```cpp
socket.shutdown(SHUT_WR);
for(auto received = socket.read(); !socket.eof(); received = socket.read()){
    cout << received;
}
```

> 注意到这里需要将 `socket` 的写端关闭，否则我们无法读取数据

完成后，运行 `make check_webget` ，可看到如下结果（如果答案正确）：

![image-20230223104516127](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230223104516127.png)

> 如果你也是 `Clion`，这个指令只能去 `cmake-build-debug` 里面输入，否则不会被执行

当然也可以用 `Clion` 直接运行，但需要配置如下：

![image-20230223105050669](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230223105050669.png)

随后运行结果，我们可以看见有输出如下：

![image-20230223105137134](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230223105137134.png)

## `ByteStream`

这里需要理解文档中所提到的 `best effort` 数据流，通俗来说，就是它只尽力传输，但不保证传输的正确性，你给他多少他就传多少。

通过文档中的介绍，我们很轻易就能发现 `ByteStream` 实际上就是一个循环队列，写的一方往队列里加东西，读的一方从队列里取东西，写者方到达容器极限但仍存在未写入的流时，写者会选择抛弃超出的部分。

我们需要完成的接口在文档中已列出：

![image-20230223110033331](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230223110033331.png)

我们可以为类添加新的 `private` 成员以实现接口。

显然，我们需要添加容器，我们可以选择 `STL` 中提供的 `deque` ，但我选择自己从头构建一个循环队列（就当复习数据结构了），我们通过一个数组和两个指针来模拟循环队列：

> 注意，`CS144` 的标准不能使用 `C` 中的数组，只能使用 `STL` 封装的 `vector`

![image-20230223114514657](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230223114514657.png)

其中， `_reader_count` 和 `_writer_count` 为计数器，记录读者写者获得的字符数总数。

通过观察接口列表，我们还需要添加一项属性：

![image-20230223114656917](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230223114656917.png)

鉴于有些接口都较为简单，在这里略过（例如构造函数）

### 写者

写者的接口较为简单，我们从这里入手。

```cpp
size_t ByteStream::write(const string &data) {
    if(this->_end_input)
        return 0;
    size_t remain = remaining_capacity(), count = 0;
    size_t cap = this->_capacity;
    if(remain >= data.length()) {
        for (auto &i: data) {
            this->_buffer[this->_writer_idx] = i;
            this->_writer_idx = (this->_writer_idx + 1) % cap;
        }
        count = data.length();
    } else {
        for(size_t i = 0; i < remain; i++) {
            this->_buffer[this->_writer_idx] = data[i];
            this->_writer_idx = (this->_writer_idx + 1) % cap;
        }
        count = remain;
    }
    this->_writer_count += count;
    this->_is_empty +=count;
    return count;
}
```

这里我们首先计算了 `remaining_capacity` 用以判断剩余的空间是否能够容纳流中的所有内容，计算的方法如下：

```cpp
size_t ByteStream::buffer_size() const {
    size_t ret = (this->_writer_idx - this->_reader_idx + this->_capacity) % this->_capacity;
    if(!buffer_empty() && !ret)
        return this->_capacity;
    return ret;
}

size_t ByteStream::remaining_capacity() const {
    return this->_capacity - buffer_size();
}
```

实际上就是总体容量减去已使用的部分，换而言之就是总容量减去队列长度，而队列长度是显然的：（队首 - 队尾 + 容量）% 容量

然而在这里我们需要特判一种情况：

由于队首和队尾相同的情况不一定是队列为空，也有可能是队列长度恰好等于总容量。

于是，若队列非空（也就是 `buffer` 非空）而计算的 `ret` 却为 0，那么显然这时的队列并不是初始状态（完全空），相反的，整个缓冲区应该都是满的。

### 读者

在这里读者的任务分为两部分，`peek_output` 与 `pop_output`。

其中 `peek_output` 只是读出内容但并不会清理缓冲区，也不会对其他变量做任何操作，可以想象成 **消费者只是先看一看，但并没有真的付钱把商品拿走** 这种情况。

如下所示：

```cpp
string ByteStream::peek_output(const size_t len) const {
    std::string reader;
    size_t cap = this->_capacity;
    if(len > buffer_size())
        throw exception();
    size_t i = this->_reader_idx, count = 0;
    while(count < len){
        reader += this->_buffer[i];
        i = (i + 1) % cap;
        count++;
    }
    return reader;
}
```

这里我们进行了一个异常处理（心血来潮用的而已）。

注意到这个函数中我们并没有对任何成员变量进行修改，而在 `pop_output` 中：

```cpp
void ByteStream::pop_output(const size_t len) {
    this->_reader_idx = (this->_reader_idx + len) % this->_capacity;
    this->_reader_count += len;
    this->_is_empty -= len;
}
```

那么在 `read` 函数中，我们的做法就是：

```cpp
std::string ByteStream::read(const size_t len) {
    string output = peek_output(len);
    pop_output(len);
    return output;
}
```

当然，对于如何判断 `eof` ，这里给出的方法为，判断是否还有输入，并且缓冲区是否为空：

```cpp
bool ByteStream::eof() const { return this->_end_input && buffer_empty(); }
```

# 实验结果

运行 `make check_lab0` 后，结果如下：

![image-20230223123332209](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230223123332209.png)

前面 6 个正确就可以了，最后一个错误是因为我是在 `WSL1` 上运行的而不是一个正宗的 `Linux` 机器，可能在 `docker` 上结果会有所不同。
