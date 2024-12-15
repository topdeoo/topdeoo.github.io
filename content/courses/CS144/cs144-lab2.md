---
title: Lab2 TCP Receiver
description: 写出完整的 TCP Receiver
tags:
  - Stanford
  - 计算机网络
date: 2023-03-16
lastmod: 2024-12-15
draft: false
---

感觉只看文档做可能还是会有些勉强，不知道是不是需要去看课程录像（虽然文档已经写的很详细了）

# 实验准备

1. `git fetch && git merge origin/lab2-startcode`
2. `make -j4`

遇到的问题：

- 合并后，运行 `make -j4` 出错：

![image-20230316142940587](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230316142940587.png)

这里需要我们安装缺少的环境 `Doxygen`（因为我不是用人家准备好的环境，所以会出现这个错误）

解决方法：

```bash
apt install libclang-cpp9 libclang1-9 doxygen libpcap-dev
```

安装后即可运行 `make -j4`

## 更新

用了 `Ubuntu 22.04` 然后装上 `clang-14` 之后，对于此错误似乎只需要装 `doxygen` 即可（当然还需要装上 `clang-format` ，否则不会高亮）

# 实验过程

## 一些对 `TCP Receiver` 的介绍

`TCP Receiver` 需要做的事情，负责告诉发送端两样东西

1. `first unassembled` 的索引，这被称之为 `ackno`（`acknowledgment number`），因为这是接收端需要从发送端拿到的第一个字符
2. `windows_size` 也就是 `capacity - first_unassembled` 的长度

这两样东西负责决定了接收端的窗口，也就是发送端允许发送字符索引的范围

这里补充一些 `TCP` 的三次握手：

​ `TCP` 三次握手是指建立一个`TCP`连接时，需要客户端和服务器总共发送 $3$ 个包。三次握手的目的是连接服务器指定端口，建立 `TCP` 连接，并同步连接双方的序列号和确认号并交换 `TCP` 窗口大小信息。第一次握手：客户端发送 `syn` 包到服务器，并进入`SYN_SEND`状态，等待服务器确认；第二次握手：服务器收到 `syn` 包，必须确认客户端的 `SYN`，同时自己也发送一个 `SYN` 包，即`SYN+ACK` 包，此时服务器进入`SYN_RECV`状态；第三次握手：客户端收到服务器的`SYN+ACK`包，向服务器发送确认包`ACK`，此包发送完毕，客户端和服务器进入`ESTABLISHED`状态，完成三次握手。

上述过程可能有些复杂，随着阅读后续的文档会逐渐理解这个过程。下面先介绍我们在 `StreamReassembler` 中写到的 `index`

## `seqno` 与 `index`

`TCP` 的报文头如下所示：

![image-20230317094624957](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230317094624957.png)

限于 `TCP` 报文头的长度限制，我们拿到的 `seqno` (另一种意义上的 `index`) 和我们需要的 `index` 是不一样的，在传输过程中的`seq`是 32 位的，但我们本地的`seq`是 64 位系统下的，所以我们需要将对其做一个转化。32 位最大值为 $2^{32}-1$, 超过这个数字就从 0 开始。

而这个 `seqno` 的含义为：当前 `payload` 中的第一个字符在整个报文中的位置模 $2^{32}$ （当然可能不止 `payload`，这在后面会提到），而这个 `seqno` 的选择并不是和 `index` 一样从 $0$ 开始的。

- 第一次握手时，`seqno` 以一个 $32$ 位随机值初始化。目的是为了防止被猜到，以及网络中较早的数据报造成干扰。一端连接中第一个 `seqno` 就以一个 $32$ 位的数字初始化，叫做`Initial Sequence Number(ISN)`，之后每个 $seq_n = ISN + n (mod\,2^{32})$
- 连接开始和结束每个占用一个序列号：除了确保收到所有字节的数据，TCP 确保流的开始和结束同样是是可靠的。因此，在 TCP 中，SYN（流开始）和 FIN（流终端）控制标志被分配 `seqno` ，都占据一个字节（SYN 标志占用的序列号就是 ISN）。流中的每个数据字节还占用一个字节。注意，标志位虽然占据一个字节但是并不算在需要读出的数据里。

为了转化 `seqno` 和 `stream index`，我们提出了 `absolute seqno`。`absolute seqno` 始终以零开始并且为 64 位，`stream index` 为`StreamReassEmbler`流中的每个字节的索引，从零开始，64 位，具体见下图:

![image-20230317085346682](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230317085346682.png)

要求我们完成 `seqno` 与 `absolute seqno` 之间的转化。

1. `absolute seqno` 2 `seqno` 是显然的，我们只需要将 `isn` 加上 `n` 模 $2^{32}$ 即可，而由于 `uint32_t` 对 $2^{32}$ 自然溢出，因此：

   ```cpp
   WrappingInt32 wrap (uint64_t n, WrappingInt32 isn) {
       uint32_t raw = uint32_t(isn.raw_value() + n);
       return WrappingInt32{ raw };
   }
   ```

2. `seqno` 2 `absolute seqno` 稍微会有一些麻烦，由于这种转换不是唯一的。`seqno `每次增加 $2^{32}$ 值都不变，但是 `absolute seqno` 变化。为了确定唯一的结果，我们需要 `checkpoint`，将可能的结果中距离`checkpoint`最近的作为最终结果。

   `checkpoint `表示最近一次转换求得的`absolute seqno`，而本次转换出的`absolute seqno`应该选择与上次值最为接近的那一个。原理是虽然 `segment` 不一定按序到达，但几乎不可能出现相邻到达的两个 `absolute seqno` 差值超过`INT32_MAX` = $2^{32} - 1$ 的情况

   因此，这里我们先将 `checkpoint` 转化为 `seqno`，然后计算出当前与上一次 `seqno` 的偏移量，如果当前 `checkpoint` 加上 `offset` 大于等于 $0$ ，那么显然我们直接返回即可，否则，`checkpoint` 是小于 `INT32_MAX` 而我们当前的 `seqno` 已经超过了 `INT32_MAX`，因此需要加上 $2^{32}$ 再返回。

   ```cpp
   uint64_t unwrap (WrappingInt32 n, WrappingInt32 isn, uint64_t checkpoint) {
       int32_t offset = n - wrap(checkpoint, isn);
       int64_t ret = int64_t(checkpoint) + offset;
       if(ret >= 0)
           return ret;
       return ret + (1ull << 32);
   }
   ```

完成后，运行 `make -j4 && ctest -R wrap`，结果如下：

![image-20230317150748620](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230317150748620.png)

## `TCP Receiver`

明确接收端的工作流程为：

1. 检查是否已经受到了 `syn`，如果没有那么直接丢弃包
2. 如果收到了，记录下 `isn`， 随后通过 `seqno` 和 `checkpoint` 计算 `absolute seqno`
3. 通过 `absolute seqno` 计算 `stream index` ，注意 `syn` 占一个字节（如果存在的话）
4. 扔进 `_reassembler`，然后计算下一个 `ackno` 和 `window size`，包装成 `TCP Segment` 然后发送给发送端

当然在这里，我们并不需要发送什么东西给发送端，做好前面的部分即可。这里唯一的问题是 `checkpoint` 怎么计算，以及接收到受到的报文为什么也会有 `ackno`。

我的想法是这个 `ack` 实际上就是上一次收到报文后，接收端计算出的 `ack` 值，那么在下一次收到报文后，这个值就变成了一个检查点。因为上一次的 `ackno` 是期望发送端发出这个值为开始索引的报文，那么在下一次确定 `absolute seqno` 时显然这个值就是 `checkpoint`（思考一下 `checkpoint` 的定义）

那么我们需要增加以下定义：

```cpp
//! isn
WrappingInt32 _isn{0};

//! eof
bool _eof{false};

//! syn
bool _syn{false};
```

随后，对于 `segment_received`：

```cpp
void TCPReceiver::segment_received(const TCPSegment &seg) {
    if(!_syn){
        if(seg.header().syn){
            _syn = true;
            _isn = seg.header().seqno;
        }
        else{
            return;
        }
    }
    if(seg.header().fin){
        _eof = true;
    }
    uint64_t _ackno = _reassembler.stream_out().bytes_written() + 1;
    uint64_t _seqno = unwrap(seg.header().seqno, _isn, _ackno);
    _reassembler.push_substring(seg.payload().copy(), _seqno - 1 + seg.header().syn, _eof);
}
```

> 这里有一个坑点就是 `payload` 的存储结构用的是 `string_view` （一种效率更高性能更好的 `string` 替代品），我们不能直接调用 `payload().str()` ，注意看方法的返回值

对于剩下的函数：

```cpp
optional<WrappingInt32> TCPReceiver::ackno() const {
    if(!_syn)
        return {};
    uint64_t _ackno = _reassembler.stream_out().bytes_written() + 1;
    if(_reassembler.stream_out().input_ended())
        _ackno++;
    return wrap(_ackno, _isn);
}

size_t TCPReceiver::window_size() const {
    return _capacity - _reassembler.stream_out().buffer_size();
}
```

最需要注意的就是在计算 `ack` 时，需要查看是否关闭连接，如果关闭了那么需要算上 `FIN` 标志位所占的一个字节。

# 实验结果

运行 `make -j4 && make check_lab2`

![image-20230317151735861](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230317151735861.png)

（一样的错误一样的不用管）
