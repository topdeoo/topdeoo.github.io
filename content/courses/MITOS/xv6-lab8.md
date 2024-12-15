---
title: Lab8 Locks
description: 优化 xv6 中的锁结构
tags:
  - MIT
  - 操作系统
date: 2022-09-12
lastmod: 2024-12-15
draft: false
---

两个实验，难度为 `moderate` 与 `hard`。

## Memory allocator

这个实验的背景如下：

`xv6` 原本是使用一个空闲页面链表，但是这样就会导致不同 CPU 上的`kalloc`和`kfree`会产生锁争用，内存页面的分配被完全串行化了，降低了系统的性能。而一个改进策略就是为每个 CPU 核心分配一个空闲链表，`kalloc`和`kfree`都在本核心的链表上进行，只有当当前核心的链表为空时才去访问其他核心的链表。通过这种策略就可以减少锁的争用，只有当某核心的链表为空时才会发生锁争用。

我们要实现的就是这样一个改进策略。

首先，我们需要对 `kmem` 进行更改，每个 `CPU` 都要给一个锁，这样就有 `NCPU` 个 `kmem` ：

```c
struct {
  struct spinlock lock;
  struct run* freelist;
  char lockname[10];
} kmem[NCPU];
```

这个 `NCPU` 是一个已被定义的宏。

随后，我们需要对每个锁都做一个初始化，锁的名称可以使用 `snprintf` 来传入：

```c
void
kinit() {
  for (int i = 0;i < NCPU;i++) {
    snprintf(kmem[i].lockname, sizeof(kmem[i].lockname), "kmem_%d", i);
    initlock(&kmem[i].lock, kmem[i].lockname);
  }
  freerange(end, (void*)PHYSTOP);
}
```

这样，我们就完成了前置工作。

我们首先对 `kfree()` 进行修改（因为比较简单显然，不需要对其他 `CPU` 的 `freelist` 做什么操作）

```c
void
kfree(void* pa) {
  struct run* r;

  if (((uint64)pa % PGSIZE) != 0 || (char*)pa < end || (uint64)pa >= PHYSTOP)
    panic("kfree");

  // Fill with junk to catch dangling refs.
  memset(pa, 1, PGSIZE);

  r = (struct run*)pa;

  // add code here
  push_off();
  int id = cpuid();

  acquire(&kmem[id].lock);
  r->next = kmem[id].freelist;
  kmem[id].freelist = r;
  release(&kmem[id].lock);

  pop_off();
}
```

这里注意 `hint` 中的说明，我们需要关闭中断才能进行操作。

对于 `kalloc()` 我们在页面不够的时候还需要去其他 `CPU` 的 `freelist` 上偷点来，具体偷多少对系统的性能是有很大影响的（这点在 `kalloctest` 的 `test2` 中有体现），如果我们每次只偷一页来，那么如果需要申请的内存比较多的话，就会频繁的使用锁，从而造成性能的降低。

当然，如果只想把实验过掉，那么每次偷一页是可行的，如下：

```c
void*
kalloc(void) {
  struct run* r;

  // add code here

  push_off();
  int id = cpuid();

  acquire(&kmem[id].lock);
  r = kmem[id].freelist;
  if (r)
    kmem[id].freelist = r->next;
  else {
    int flag = 0;
    for (int i = 0;i < NCPU; i++) {
      if (i == id)
        continue;
      acquire(&kmem[i].lock);
      if (kmem[i].freelist) {
        struct run* p = kmem[i].freelist;
        kmem[i].freelist = p->next;
        kmem[id].freelist = p;
        p->next = 0;
        flag = 1;
      }
      release(&kmem[i].lock);
      if (flag)
        break;
    }
    r = kmem[id].freelist;
    if (r)
      kmem[id].freelist = r->next;
  }
  release(&kmem[id].lock);
  pop_off();

  if (r)
    memset((char*)r, 5, PGSIZE); // fill with junk
  return (void*)r;
}
```
