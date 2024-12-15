---
title: 实验环境与 Lab0 (sp23)
description: Stanford CS144 Spring 2023 实验环境与 Lab0
tags:
  - Stanford
  - 计算机网络
  - 环境配置
date: 2023-10-05
lastmod: 2024-12-15
draft: false
---

# 前言

关于为什么选修这门课，为什么突然弃坑又为什么突然醒悟重新写这部分内容，请看 [[CS144-Env|关于上个版本的 CS144]] 中的几篇文章

# Envrionment Setting Up

关于我的环境，如下所示：

> 请注意文章创建的时间与工具版本之间的关系

- OS: Linux x86_64 (6.1.53-1-MANJARO)
- CPU: 13th Gen Intel i5-13500H (16) @ 4.700GHz
- GPU: Intel Raptor Lake-P \[Iris Xe Graphics\]
- Memory: 16GB
- Shell: zsh 5.9
- Editor: VS Code
- C Compiler: gcc(version 13.2.1) clang(version 16.0.6)
- C++ Compiler: g++(version 13.2.1) clang++(version 16.0.6)
- C/C++ build tools: cmake(version 3.27.6) xmake(version 2.8.3) make(version 4.4.1)
- Rust: rustc 1.73.0-nightly
- Python: Python 3.11.5
- Java: openjdk 21 2023-09-19
- Go: version go1.21.1 linux/amd64

不错，现在我可以用之前用不了的方案二了 :joy:

由于 `sp23` 使用的是 `C++20`，所以保证你的 `cmake` 与 `g++/clang++` 支持 `C++20`（建议直接和我用一个版本的）

拉取 `github` 上的代码，建议根据 [How to make a fork of repo private](https://stackoverflow.com/questions/10065526/github-how-to-make-a-fork-of-public-repository-private) 进行设置，然后拉取到本地：

```shell
git clone git@github.com:<username>/<repo-name>.git
```

# How to debug

如何使用 `VS Code` 进行调试？

答案当然是自己写 `launch.json` 了，但由于本人水平不够，所以为每个过不去的测试都会写一个简单的配置，例如 `check_webget`：

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "cppdbg",
            "request": "launch",
            "name": "webget debug",
            "program": "${workspaceFolder}/build/apps/webget",
            "stopAtEntry": false,
            "cwd": "${workspaceFolder}/build",
            "args": [
                "cs144.keithw.org",
                "/nph-hasher/xyzzy"
            ],
            "setupCommands": [
                {
                    "description": "Enable pretty-printing for gdb",
                    "text": "-enable-pretty-printing",
                    "ignoreFailures": true
                }
            ],
            "MIMode": "gdb",
        },
    ]
}
```

需要注意的点实际上就是 `program` 部分要写对，每个测试对应的可执行文件的名称叫什么能知道就行。如果需要多配置，在 `configurations` 中添加类似的配置即可。

> 你需要知道的一些预定义变量
>
> - **${workspaceFolder}** - 当前工作目录(根目录)
> - **${workspaceFolderBasename}** - 当前文件的父目录
> - **${file}** - 当前打开的文件名(完整路径)
> - **${relativeFile}** - 当前根目录到当前打开文件的相对路径(包括文件名)
> - **${relativeFileDirname}** - 当前根目录到当前打开文件的相对路径(不包括文件名)
> - **${fileBasename}** - 当前打开的文件名(包括扩展名)
> - **${fileBasenameNoExtension}** - 当前打开的文件名(不包括扩展名)
> - **${fileDirname}** - 当前打开文件的目录
> - **${fileExtname}** - 当前打开文件的扩展名
> - **${cwd}** - 启动时 task 工作的目录
> - **${lineNumber}** - 当前激活文件所选行
> - **${selectedText}** - 当前激活文件中所选择的文本
> - **${execPath}** - vscode 执行文件所在的目录

# Lab0

实践部分跳过，从写代码的阶段开始，请遵守代码规范：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231005164047.png)

> 请使用 Vscode 中的 `cmake/cmake tools` 插件，可以省去很多麻烦，当然你想输命令来做也是可以的
>
> 还有 `clangd` 来进行文件的索引（虽然感觉有些时候 `clangd` 挺笨的）

怎么大括号要换行啊，忍不了了，直接改 `.clang-format`：

```yaml
---
Language: Cpp
BasedOnStyle: Mozilla
IndentWidth: 4
AccessModifierOffset: -4
ColumnLimit: 116
SpacesInParentheses: true
AlwaysBreakAfterReturnType: None
AlwaysBreakAfterDefinitionReturnType: None
SpaceBeforeCpp11BracedList: true
BreakBeforeBinaryOperators: All
Cpp11BracedListStyle: true
AllowShortBlocksOnASingleLine: Always
BreakBeforeBraces: Custom
BraceWrapping:
  AfterClass: false
  AfterControlStatement: false
  AfterFunction: false
  AfterStruct: false
  AfterEnum: false
  SplitEmptyFunction: false
  SplitEmptyRecord: false
  SplitEmptyNamespace: false
PackConstructorInitializers: NextLine
...
```

## Read Code

> Please read over the public interfaces (the part that comes after “public:” in the files util/socket.hh and util/file_descriptor.hh. (Please note that a Socket is a type of FileDescriptor, and a TCPSocket is a type of Socket.)

这里我们需要阅读 `libsponge/uitl/socket.hh` `libsponge/uitl/address.hh` 中对于 `TCPSocket`，`Socket` 与 `Address` 的定义及用法。

实际上的要求并不复杂，我们需要建立一个 `TCP` 连接，然后发送一段预设好的消息，等到回复后，将其打印出来。

==仔细阅读== 文档即可完成，代码如下：

```cpp
void get_URL( const string& host, const string& path ) {
    TCPSocket socket = TCPSocket();
    socket.connect( Address( host, "http" ) );
    socket.write( "GET " + path + " HTTP/1.1\r\nHost: " + host + "\r\nConnection: close\r\n\r\n" );
    socket.shutdown( SHUT_WR );
    string buffer;
    while ( !socket.eof() ) {
        socket.read( buffer );
        cout << buffer;
    }
}
```

注意这里的 `read` 函数和之前不一样了，需要传入一个引用，而不是接收一个返回值。

> 如果你使用的编译器为 `clang`，注意在 `src/byte_stream.hh` 中需要添加头文件 `#include <cstdint>` 否则会导致 `uint64_t` 报错。

随后，进行检查，我们可以使用两种方法

如果你是命令行偏爱者，请输入：

```bash
cd build
make -j`nproc`
./apps/webget cs144.keithw.org /hello
```

进行第一步测试，如果通过了，那么可以直接跑写好的单元测试：

```bash
# if you are in the `build` directory
cd ..
cmake --build build --target check_webget
```

然后可以看见如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231005171344.png)

如果你不想敲命令行，那么可以使用之前说的 `cmake` 插件，如下图所示：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231005173538.png)

> 如果嫌弃 vsc 的日志输出没有高亮的话，可以下载一个插件 `Build Output Colorizer`
>
> 虽然这个好像也没什么太大的用处……

这个插件的测试不如命令行稳定，可能第一次测失败了，第二次就成功了（如果失败了可以转用命令行试试看）

## An in-memory reliable byte stream

这里需要理解文档中所提到的 `best effort` 数据流，通俗来说，就是它只尽力传输，但不保证传输的正确性，你给他多少他就传多少。

通过文档中的介绍，我们很轻易就能发现 `ByteStream` 实际上就是一个循环队列，写的一方往队列里加东西，读的一方从队列里取东西，写者方到达容器极限但仍存在未写入的流时，写者会选择抛弃超出的部分。

我们需要完成的接口在文档中已列出，请 ==仔细阅读== 每个函数后的注释，保证已经明确了这个函数的功能。

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231005213314.png)

注意，这里 `Writer` 与 `Reader` 都继承自 `ByteStream`，所以我们只需要向 `ByteStream` 添加成员即可。

我们可以为类添加新的 `protected` 成员以实现接口。

显然，我们需要添加容器，我们可以选择 `STL` 中提供的 `deque` ，但我选择自己从头构建一个循环队列（就当复习数据结构了），我们通过一个数组和两个指针来模拟循环队列：

> 注意，`CS144` 的标准不能使用 `C` 中的数组，只能使用 `STL` 封装的 `vector`

### Init Version

我们从成员变量开始，由于我们考虑使用 `vector` 和双指针来模拟循环队列，并且考虑到接口中存在：

1. `set_error() / has_error()`
2. `is_closed() / is_finished()`
3. `bytes_pushed() / bytes_poped()`

所以我们可以设计一些变量，在传输的时候就进行维护，这样就可以直接返回而不需要重新计算了

```cpp
class ByteStream {
protected:
    uint64_t capacity_;
    uint64_t write_index_ { 0 };
    uint64_t read_index_ { 0 };
    uint64_t read_count_ { 0 };
    uint64_t write_count_ { 0 };
    bool closed_ { false };
    bool error_ { false };
    std::vector<char> buffer_;
// ... other code
}
```

我们从上面提到的简单接口开始实现，首先是构造函数：

```cpp
ByteStream::ByteStream( uint64_t capacity ) : capacity_( capacity ){
    buffer_.resize( capacity );
}
```

> 这里使用了 `resize` 而非 `reserve`，是因为 `reserve` 只会设置 `capacity`，当你第一次放元素进去的时候还是需要 `push_back / emplace_back`，并不适合我们这里的双指针。
>
> 至于用 `vector` 的原因，就是我们并不知道 `std::array<typename Tp, size_t Nm>` 中的 `Nm` 值，其为`RunTime`的。

简单的接口如下：

```cpp
void Writer::close() {
    // Your code here.
    closed_ = true;
}

void Writer::set_error() {
    // Your code here.
    error_ = true;
}

bool Writer::is_closed() const {
    // Your code here.
    return closed_;
}

uint64_t Writer::bytes_pushed() const {
    // Your code here.
    return write_count_;
}

bool Reader::is_finished() const {
    // Your code here.
    return closed_ && bytes_buffered() == 0;
}

bool Reader::has_error() const {
    // Your code here.
    return error_;
}

uint64_t Reader::bytes_popped() const {
    // Your code here.
    return read_count_;
}
```

在这里，请注意 `is_finished` 的实现，如何保证已经传输完成？显然，我们需要保证两点：

1. 输入端保证不会有输入了
2. 缓冲区已经被清空了

而对于 `byte_buffered`，我们注意到还有一个类似的函数 `available_capacity`，但请注意，这两个函数不能调用（因为属于不同的类）

但其实我们可以发现 `available_capacity() = capacity_ - byte_buffered()`

所以我们先来实现 `byte_buffered()`，实际上就是在求循环队列的长度：（队首 - 队尾 + 容量）% 容量

然而在这里我们需要特判一种情况：

由于队首和队尾相同的情况不一定是队列为空，也有可能是队列长度恰好等于总容量。

于是，若队列非空（也就是 `buffer` 非空）而计算的 `result` 却为 0，那么显然这时的队列并不是初始状态（完全空），相反的，整个缓冲区应该都是满的。

```cpp
uint64_t Reader::bytes_buffered() const {
    // Your code here.
    auto result = ( write_index_ - read_index_ + capacity_ ) % capacity_;
    if ( !result && write_count_ > read_count_ ) {
        result = capacity_;
    }
    return result;
}
```

这样，我们显然也能实现 `available_capacity`：

```cpp
uint64_t Writer::available_capacity() const {
    // Your code here.
    uint64_t busy = ( write_index_ - read_index_ + capacity_ ) % capacity_;
    if ( write_count_ != read_count_ && !busy ) {
        busy = capacity_;
    }
    return capacity_ - busy;
}
```

当 `helper` 函数都实现完后，接着就可以实现主要函数了，我们从较为简单的 `Writer.push()` 看起，由于是尽力传输，所以 `push` 会按照下面步骤来完成：

1. 判断是否已经关闭输入端，如果是，那么不传输，否则继续
2. 计算出当前缓冲区的剩余容量，如果需要传输的数据长度大于这个容量，那么我们只传输长度为剩余容量的子串，否则我们传输整个字符串
3. 维护 `write_count_` 的值

代码就十分显然了：

```cpp
void Writer::push( string data ) {
    // Your code here.
    if ( closed_ ) {
        return;
    }
    auto remaining = available_capacity();
    if ( remaining >= data.size() ) {
        for ( auto& i : data ) {
            buffer_[write_index_] = i;
            write_index_ = ( write_index_ + 1 ) % capacity_;
        }
        write_count_ += data.size();
    } else if ( remaining > 0 ) {
        data = data.substr( 0, remaining );
        for ( auto& i : data ) {
            buffer_[write_index_] = i;
            write_index_ = ( write_index_ + 1 ) % capacity_;
        }
        write_count_ += remaining;
    }
}
```

> 当然这里会有一个 `bug`，在后面会修改

对于 `Reader` 而言，我们有两个函数， `peek` 与 `pop`，其中 `peek` 只是读出内容但并不会清理缓冲区，也不会对其他变量做任何操作，可以想象成 **消费者只是先看一看，但并没有真的付钱把商品拿走** 这种情况。

但不同的是，你会发现 `peek` 居然没有输入参数，这说明每次 `peek`，`Reader` 都会把缓冲区内所有可读的东西扔出去（最好情况），那么你就会写出如下代码：

```cpp
string_view Reader::peek() const {
    // Your code here.
    auto reamining = byte_buffered();
    vector<char> tmp;
    uint64 count = 0, index = read_index;
    while(count < remaining){
	    tmp.emplace_back(buffer_[index]);
	    index = ( index + 1 ) % capacity_;
    }
    auto result = string_view(tmp.begin(), tmp.end());
    return result;
}
```

乍一看好像没什么问题，但注意

> `string_view` 是无内存的，他只是引用了一个已经存在的内存地址而已，你可以把它当作一个切片。
> 而在上面那个函数中，`result` 引用了 `tmp` 的内存地址，但 `tmp` 是个局部变量，当函数返回时就会被销毁，那么返回回去的 `result` 就成为了一个 `dangling reference`，我们永远无法取得存在于 `buffer_` 的数据。

明白了这一点，实际上就好做了很多，我们可以让 `string_view` 直接引用 `buffer_`，但请注意，这样的话我们就损失了一些吞吐率（没办法一次全取出来了，因为队列是循环的，会导致尾在头前面的情况），代码如下：

```cpp
string_view Reader::peek() const {
    // Your code here.
    auto result = string_view( buffer_.begin(), buffer_.end() );
    if ( write_index_ > read_index_ ) {
        result = result.substr( read_index_, write_index_ - read_index_ );
    } else {
        result = result.substr( read_index_ );
    }
    return result;
}
```

至于 `pop`，就很显然了，并不需要太多的思考：

```cpp
void Reader::pop( uint64_t len ) {
    // Your code here.
    read_index_ = ( read_index_ + len ) % capacity_;
    read_count_ += len;
}
```

测试如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231006121208.png)

其错误为：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231006121246.png)

### Final Version

出现这个错误的原因是：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231006121644.png)

我们上面的 `push` 和 `peek` 都没有处理传输的字符串其实是个空串的情况（其实主要是 `push`，`peek` 的 `substr` 应该都已经算是处理了）

于是我们修改 `push` 如下：

```cpp
void Writer::push( string data ) {
    // Your code here.
    if ( closed_ ) {
        return;
    }
    if ( data.empty() ) {
        return;
    }
    uint64_t remaining = available_capacity();
    if ( remaining >= data.size() ) {
        for ( auto& i : data ) {
            buffer_[write_index_] = i;
            write_index_ = ( write_index_ + 1 ) % capacity_;
        }
        write_count_ += data.size();
    } else if ( remaining > 0 ) {
        data = data.substr( 0, remaining );
        for ( auto& i : data ) {
            buffer_[write_index_] = i;
            write_index_ = ( write_index_ + 1 ) % capacity_;
        }
        write_count_ += remaining;
    }
}
```

对于 Reader 而言：

```cpp
string_view Reader::peek() const {
    // Your code here.
    if ( bytes_buffered() == 0 ) {
        return {};
    }
    auto result = string_view( buffer_.begin(), buffer_.end() );
    if ( write_index_ > read_index_ ) {
        result = result.substr( read_index_, write_index_ - read_index_ );
    } else {
        result = result.substr( read_index_ );
    }
    return result;
}
```

这样，就能通过所有测试点了

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231006121855.png)

如果你更喜欢命令行，那么可以测试如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231006121953.png)
