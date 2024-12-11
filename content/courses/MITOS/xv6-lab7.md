---
title: Lab7 Networking
description: 使用 E1000 网卡写一个驱动程序
tags:
  - OS
  - MIT
date: 2022-09-08
lastmod: 2024-12-11
draft: false
---

说是一个驱动程序，实际上需要完成的只有两个函数，把源码看明白之后直接跟着 `Hint` 写就行。（记得去看 `Background`）

那本厚厚的文档可以不用读，只用看几个部分就行。

实验难度为 `hard`

## Your Job

**发送数据的流程**：

`CPU`将`IP`数据包打包放入内存中，通知`DMA Engine`进行`DMA`传输，数据放入 FIFO data buffer 中。MAC 将 IP 数据包拆分为最小 64KB，最大 1518KB 的数据帧，每一帧包含了目标 MAC 地址、自己的 MAC 地址和数据包中的协议类型以及 CRC 校验码。目标 MAC 地址通过 ARP 协议获取。PHY 接受 MAC 传送的数据，将并行数据转化为串行数据后进行编码，在转变为模拟信号将数据进行传输。

首先，我们给出 `struct tx_desc` 与 `struct desc` 的结构，在文档的 `3.3` 可以找到：

![tx_desc](https://s2.loli.net/2022/09/08/Wsh47qN1pbzIcdQ.png)

![tx_decs](https://s2.loli.net/2022/09/08/DQEeASsk4z83cUC.png)

### e1000_transmit

根据 `Hint` ，我们知道首先我们从 `reg E1000_TDT` 中读取索引，然后对索引进行检查。然后，我们从 `TX ring` 中取出此索引指向的 `tx_desc` ，我们会检查这个 `tx_desc` 的状态是否被设置了 `E1000_TXD_STAT_DD` ，也就是是否被硬件设置了完成标志（在文档的 `3.3.3.2` 中有描述），如果没有被设置，那么我们直接返回错误，否则我们使用 `mbuffree()` 释放已经完成转运的 `mbuf` （也就是上面索引指向的那个 `mbuf` ）。随后，我们会对传入的 `mbuf m` 进行一系列设定：将其 `tx_desc` 中的 `Buffer Address` 指向 `m->head` ，将 `tx_desc` 中的 `Length` 指向 `m->len` 并且我们还需要设定 `tx_desc` 中的 `cmd`（含义可以去文档的 `3.3.3.1` 中查看），但是宏就给了两个，所以……

最后，我们需要更新 `reg E1000_TDT` 的值

这样，代码描述为：

```c
int
e1000_transmit(struct mbuf* m) {
  //
  // Your code here.
  //
  // the mbuf contains an ethernet frame; program it into
  // the TX descriptor ring so that the e1000 sends it. Stash
  // a pointer so that it can be freed after sending.
  //
  acquire(&e1000_lock);
  uint32 idx = regs[E1000_TDT];
  if (idx >= TX_RING_SIZE) {
    release(&e1000_lock);
    return -1;
  }
  struct tx_desc* t = &tx_ring[idx];
  if ((t->status & E1000_TXD_STAT_DD) == 0) {
    release(&e1000_lock);
    printf("hasn't finished previous transmission request\n");
    return -1;
  }
  if (tx_mbufs[idx])
    mbuffree(tx_mbufs[idx]);
  t->addr = (uint64)m->head;
  t->length = (uint16)m->len;
  t->cmd = (uint8)(E1000_TXD_CMD_EOP | E1000_TXD_CMD_RS);
  tx_mbufs[idx] = m;
  regs[E1000_TDT] = (idx + 1) % TX_RING_SIZE;
  release(&e1000_lock);
  return 0;
}
```

注意，我们这里使用了锁，因为这里涉及到了临界区的竞争问题：`tx_ring` 和 `tx_mbufs` 这两个临界区，所以我们必须要使用锁来保证次序。

（如果一开始想不到的话，可以去 `kernel/uart.c` 中的 `uartputc` 看看）

### e1000_recv

这个我就不解释 `Hint` 了描述了，直接上代码：

```c
static void
e1000_recv(void) {
  //
  // Your code here.
  //
  // Check for packets that have arrived from the e1000
  // Create and deliver an mbuf for each packet (using net_rx()).
  //

  while (1) {
    uint32 idx = (regs[E1000_RDT] + 1) % RX_RING_SIZE;
    struct rx_desc* r = &rx_ring[idx];

    if ((r->status & E1000_RXD_STAT_DD) == 0)
      return;

    struct mbuf* m = rx_mbufs[idx];
    mbufput(m, r->length);
    net_rx(m);
    rx_mbufs[idx] = mbufalloc(0);

    if (!rx_mbufs[idx])
      panic("e1000_recv");

    rx_ring[idx].addr = (uint64)rx_mbufs[idx]->head;
    rx_ring[idx].status = 0;
    regs[E1000_RDT] = idx;
  }
}
```

注意到这里，我们并没有使用锁，这是因为因为`e1000_recv()`是在`e1000_intr()`中被调用的，也就是说这实际上是一个 `interrupt handler`，只有一个进程在跑这个 handler，因此不存在共享的数据结构。

（如果这个也不能想到的话，也可以查看 `kernel/uart.c` 中的 `uartgetc` 实现）

## 实验结果

![Final Grade](https://s2.loli.net/2022/09/08/wsdGrg1Opq6AXBW.png)
