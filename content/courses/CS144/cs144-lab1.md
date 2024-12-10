---
title: Lab1 重组字节流
description: 实现重组字节流
tags:
  - Stanford
  - Network
date: 2023-02-26
lastmod: 2024-12-10
draft: false
---

> 一个函数写了两天，学成这样确实可以放弃了
>
> 更新：写了一个星期

从这个实验（准确来说是上个实验）开始，接下来的三个实验将实现一个 `TCP Socket` ，其结构如下所示：

![image-20230226170419203](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230226170419203.png)

# 实验目标

在本次实验中，需要实现的为 `TCP Receiver` 中的 `Stream Reassembler` 部件，其包涵了 `lab0` 中实现的 `ByteStream`，所以如果上个实验的测试点没有全过去（除了最后一个测试点），那在这个实验中可能还需要修改上一次实验的代码，建议把 `lab0` 完全通关再来写这个。

`StreamReassembler` 的工作原理在 `handout` 中描述的不算很详细，在这里解释一下它的原理：

> TCP发送方将其字节流划分为多个短段 (每个不超过1460字节的子字符串)，以便每个短段都能装入数据报中。
>
> 但是网络可能会**重新排序**这些数据报，或者**丢弃**它们，或者**不止一次**地发送它们。接收端必须将这些段重新组装成它们开始时的连续字节流。
>
> 接收端必须将这些段重新组装成它们开始时的连续字节流。

本质上来说，就是使用不可靠的数据报提供一对可靠的字节流，从加粗的字可以看出实际上接受方收到的数据段可能是重复乱序的，所以需要对这些数据段进行取舍，以拼接出一份正确的数据报。

接下来回答一些思路上的疑问：

# FAQ

1. 传入的参数 `index` 的意义

   当前数据段 `data` 第一个字符在整个数据包中的位置

2. `capacity` 到底指代什么

   还是这张图

   ![image-20230311141100999](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230311141100999.png)

   因此我们需要记录当前已经输出了的数据报的索引，以此来确定我们应该留下哪些数据段，丢弃哪些数据段

3. 重组后如何输出结果

   每次收到数据段后就尝试进行输出

# 实验过程

## 成员定义

在这之前，因为我们需要存储暂时不能输出的数据段，这里我的做法是使用 `set` 来存储，并按照 `index` 的大小进行排序（红黑树），时间复杂度为 $O(n\log{n})$，应该会有快的方法但我懒得写了，思考了一下可能用位图和队列来存储会更快。

这里我的存储结构定义如下：

```cpp
 struct Node{
        std::string data = "";
        size_t idx = 0;
        bool operator < (const Node b) const{
            return idx < b.idx;
        }
    };                   //!< 消息结构

    std::set<Node> _sequence = {}; //!< 消息序列
    size_t _first_unread; //!< 第一个未读字节的索引
    size_t _unassembled_bytes; //!< 未组装字节的数量
    bool _eof_flag; //!< eof标志
```

在构造函数中初始化如下：

```cpp
StreamReassembler::StreamReassembler(const size_t capacity) : _first_unread(0), _unassembled_bytes(0),
_eof_flag(false), _output(capacity), _capacity(capacity) {}
```

## `push_substring`

实验最难的部分就是这个函数（感觉是废话）， `push_substring` 的难点在于子串的合并，暴力的话需要讨论情况太多，相当于一个大模拟，所以我的流程是：

1. 判断是否超出容量
2. 处理前后冗余部分
3. 合并子串
4. 写入字节流
5. 处理 `EOF`

### 判断容量

显然我们应该扔掉索引超过 `first_unacceptable` 的内容，因为这种我们不能进行暂存，并且网络会重复发，我们不必担心之后会收不到

```cpp
if(index >= this->_first_unread + this->_capacity)
    return;
```

### 处理冗余

冗余是指类似如下的情况：

1. 传入数据段 `{data="ghX", idx=6}` ，然而 `capacity=8` 因此我们无法存下最后一个字符 `X` ，所以 `X` 在这里需要被去除
2. 传入数据段 `{data="abcde", idx=0}`，然而 `first_unread=2` ，因此字符 `ab` 实际上已经被输出，我们不应该再次存储

显然，因此在这里我们需要对传入的数据段的首尾进行判断，截取其子串进行存储。

```cpp
Node node;
if(index + data.length() < this->_first_unread)
    _handle_eof(eof);
else {
    size_t head_offset = 0, tail_offset = 0;
    if(index < this->_first_unread){
        head_offset = this->_first_unread - index;
        node.idx = this->_first_unread;
    }
    else if(index + data.length() > this->_first_unread + this->_capacity){
        tail_offset = index + data.length() - this->_first_unread - this->_capacity;
        node.idx = index;
    }
    else {
        node.idx = index;
    }
    node.data.assign(data.begin() + head_offset, data.end() - tail_offset);
}
this->_unassembled_bytes += node.data.length();
```

### 合并子串

假设在 `set` 中已经存储了如下两个结构：

`{data="abc", idx=0}, {data="gh", idx=6}`

现在传入的数据段为：`{data="cdefh", idx=2}`

显然这个数据段是可以被合并的，并且前后均需要被合并，于是我们在这里使用 `lower_bound` 进行二分合并：

```cpp
int merge = 0;
auto iter = this->_sequence.lower_bound(node);
while((iter != this->_sequence.end()) && (merge = _rectifying(node, *iter)) >= 0){
    this->_unassembled_bytes -= merge;
    this->_sequence.erase(iter);
    iter = this->_sequence.lower_bound(node);
}

while(iter != this->_sequence.begin()){
    iter--;
    merge = _rectifying(node, *iter);
    if(merge >= 0){
        this->_unassembled_bytes -= merge;
        this->_sequence.erase(iter);
        iter = this->_sequence.lower_bound(node);
    }
}

if(node.data.length() > 0)
    this->_sequence.insert(node);
```

其中 `_rectifying` 将 `b` 合并至 `a` 中，并更新其 `idx`，如下： 

```cpp
int StreamReassembler::_rectifying(StreamReassembler::Node &a, const StreamReassembler::Node &b) {
    int merge = -1;
    Node x, y;
    if(a.idx > b.idx)
        x = b, y = a;
    else
        x = a, y = b;

    if(x.idx + x.data.length() < y.idx)
        merge = -1;
    else if(x.idx + x.data.length() >= y.idx + y.data.length()){
        a = x;
        merge = int(y.data.length());
    }
    else {
        merge = int(x.idx + x.data.length() - y.idx);
        a.data = x.data + y.data.substr(merge);
        a.idx = x.idx;
    }
    return merge;
}
```

注意到，最后我们对 `node.data` 进行空串的判断，我们需要忽略空串而不是将其加入 `set` 中

为什么不在一开始就进行忽略，这是因为空串可能包含着 `EOF` 标识，我们需要对其进行判断。

### 处理输出

简单的处理，只需要对 `first_unread` 进行判断，并将 `set` 中的内容写入 `ByteStream` 中即可

```cpp
while(!this->_sequence.empty() && this->_sequence.begin()->idx == this->_first_unread){
    const Node &x = *this->_sequence.begin();
    size_t write = this->_output.write(x.data);
    this->_first_unread += write;
    this->_unassembled_bytes -= write;
    this->_sequence.erase(this->_sequence.begin());
}
```

### 判断 eof

对 `eof` 的判断并不像想象中的那样无脑，因为 `eof` 只是数据段中可能包涵的一个标识，并且这个 `eof` 标识有可能先到达了而中间数据端还没有到（或者还没有被翻译出去），因此真实的 `eof` 判断应该由传入的标识与 `StreamReassembler` 是否存在未翻译的字符共同决定。

```cpp
void StreamReassembler::_handle_eof(const bool eof) {
    if(eof)
        this->_eof_flag = true;
    if(this->_eof_flag && this->_unassembled_bytes == 0)
        this->_output.end_input();
}
```

当完全达到 `eof` 后，我们需要关闭 `ByteStream` 的写端。

## 其他函数

```cpp
size_t StreamReassembler::unassembled_bytes() const {
    return this->_unassembled_bytes;
}

bool StreamReassembler::empty() const { return this->_unassembled_bytes == 0; }
```

# 实验结果

运行 `make -j4` 后，运行 `make check_lab1` ，如下所示：

![image-20230311145134157](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230311145134157.png)

最后一个错误仍然是因为我不是真实的 `Linux` 系统（WSL1），所以会导致这个



