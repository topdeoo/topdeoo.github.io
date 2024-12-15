---
title: Lab2 System Call
description: Lab2 熟悉一些系统调用
tags:
  - MIT
  - 操作系统
date: 2022-04-01
lastmod: 2024-12-15
draft: false
---

这个实验有一些小坑 😤

## 实验准备

运行[Lab: System calls (mit.edu)](https://pdos.csail.mit.edu/6.828/2021/labs/syscall.html)上的命令

```bash
git fetch
git checkout syscall
make clean
```

即可得到该实验的实验环境了。

我们所需要做的就是跟着题目与 `Hint` 一步一步完成即可。

但在这之前，需要检查你有没有把官网上橙色的部分做完。

## System call tracing

要求实现一个跟踪命令的系统调用，在之后或许可以使用这个系统调用来 debug（bushi。

官方的文档已经把要求说的很清楚了，接下来我们跟着 `Hint` 一步一步做。

1. 在 `Makefile` 中添加 `$U/_trace$` 。
2. 运行 `make qemu` 会发现编译错误，这是因为 `trace.c` 的很多定义都不存在，我们需要去添加定义。
   1. 在 `user/user.h` 中添加 `int trace(int);`
   2. 在 `usys.pl` 中添加 `entry("trace")`
   3. 在 `kernel/syscall.h` 中添加 `#define SYS_trace 22`
   4. 在 `kernel/syscall.c` 中 `syscalls` 映射表中添加 `[SYS_trace] sys_trace`，并且添加函数声明 `extern uint64 sys_trace(void);`
3. 在 `kernel/proc.h` 的 `proc` 中添加成员变量 `mask`
4. 在 `kernel/sysproc.c` 中添加 `sys_trace` 函数的实现
5. 修改 `kernel/proc.c` 中的 `fork` 函数
6. 修改 `kernel/syscall.c` 中的 `syscall` 函数

当我们完成 1,2 步后，我们运行 `make qemu` 可以发现已经能通过编译了，这是因为我们已经在用户层注册了系统调用 `trace` ，但当我们运行 `trace 32 grep hello README`时会发现调用失败。

因为我们没有在内核层实现 `trace` 的具体实现，使得用户层无法传递到内核层。

于是，我们在 `kernel/sysproc.c` 中添加 `sys_trace`：

```c
uint64
sys_trace(void) {
  uint64 p;
  if (argaddr(0, &p) < 0) {
    return -1;
  }
  myproc()->mask = p;
  return 0;
}
```

然后根据文档说明，修改 `fork` 函数与 `syscall` 函数：

```c
// Create a new process, copying the parent.
// Sets up child kernel stack to return as if from fork() system call.
int
fork(void) {
  int i, pid;
  struct proc* np;
  struct proc* p = myproc();

  // ....

  /* add */
  // copy trace mask
  np->mask = p->mask;

  // .....

  return pid;
}
```

```c
// add
static char sysnames[][10] = {
  "failed", // 索引从 0 开始，但宏定义是从 1 开始的
  "fork", "exit", "wait", "pipe", "read",
  "kill", "exec", "fstat", "chdir", "dup",
  "getpid", "sbrk", "sleep", "uptime", "open",
  "write", "mknod", "unlink", "link", "mkdir",
  "close", "trace", "sysinfo", // 这里多添加了下一题的 "sysinfo"
};

void
syscall(void) {
  int num;
  struct proc* p = myproc();

  num = p->trapframe->a7;
  if (num > 0 && num < NELEM(syscalls) && syscalls[num]) {
    p->trapframe->a0 = syscalls[num]();
    // 掩码与实际相等（这里需要去看一下官网上掩码的定义）
    if ((1 << num) & (p->mask)) {
      printf("%d: syscall %s -> %d\n",
        p->pid, sysnames[num], p->trapframe->a0);
    }
  }
  else {
    printf("%d %s: unknown sys call %d\n",
      p->pid, p->name, num);
    p->trapframe->a0 = -1;
  }
}
```

## Sysinfo

实现一个 `sysinfo` 的系统调用，测试的代码已经写好放在 `sysinfotest` 中。`sysinfo` 需要打印出可用的内存空间与当前状态不是 `UNUSED` 的进程数量。

跟随 `Hint` 一步一步完成。在用户层注册的部分与 `trace` 部分相同，在此略过。

我们需要在 `kernel/sysproc.c` 中实现 `sys_sysinfo` 函数，要求是需要使用 `copyout` 函数将 `struct sysinfo` 从内核层传递到用户层。函数的用法可以参照`filestat()` (`kernel/file.c`)。

需要注意的是，我们还需要添加一行 `#include "sysinfo.h"` 把 `struct sysinfo` 链接进来。

```c
uint64
sys_sysinfo(void) {
  uint64 addr;
  if (argaddr(0, &addr) < 0) {
    return -1;
  }
  struct sysinfo si;
  si.freemem = freemem();
  si.nproc = nproc();
  if (copyout(myproc()->pagetable, addr, (char*)&si, sizeof(si)) < 0)
    return -1;
  return 0;
}

```

然后，我们在 `kernel/kalloc.c` 中添加 `freemem()` 以计算空闲空间，在 `kernel/proc.c` 中添加 `nproc()` 以计算状态不为 `UNUSED` 的进程数量。

函数的写法都可以参照同文件下其他函数的写法。

```c
uint64
freemem(void) {
  struct run* r;
  acquire(&kmem.lock);
  r = kmem.freelist;
  uint64 ret = 0;
  while (r) {
    ret++;
    r = r->next;
  }
  release(&kmem.lock);
  return ret * PGSIZE;
}
```

```c
uint64
nproc(void) {
  struct proc* p;
  uint64 ret = 0;
  for (p = proc; p < &proc[NPROC]; p++) {
    if (p->state != UNUSED)
      ret++;
  }
  return ret;
}

```

> 以为这样就可以了吗?

不，现在`make qemu` 的话，会报错，意思是 `freemem()` 与 `nproc()` 函数都未声明。大冤种对比头文件对比了半天发现，我们除了在 `sysproc.c` 里添加函数外，其他新添加的函数都应该在 `defs.h` 里面声明（能不能再`Hint`里面写一下啊 😒）

添加完后，就会发现编译可以通过了。

## 最终成绩

![Final Grade](https://s2.loli.net/2022/04/13/GtDPix4v76mKX8W.png)

做完还是记得 `git add . && git commit -m "finish"`

## 更新

做完这个实验其实还是会云里雾里的，因为完全是按照 `Hint` 很顺畅做下来的，没有什么思考。

我思考了一下还是把这部分放上来，防止之后出现相似的情况。

这个实验其实是想告诉你，`xv6` 系统乃至其他所有操作系统，究竟是怎么实现系统调用的，为什么你要修改那么多文件等等，但这些如果做完没有思考的话，这个实验等于没做。

由于我在做这个实验前已经写过关于 `MINIX` 关于添加 `chrt` 系统调用的实验了（虽然那个也是跟着文档一步一步做的），在做完这个实验后疑惑更深，于是查阅了文档，大概知道了系统调用的过程：

![Flow Chart](https://s2.loli.net/2022/04/18/s578ArxjbQedPGo.png)

至于为什么需要这么复杂，而不是直接调用函数。

或许认真看一遍 `xv6` 教材的第一章，这个问题就能迎刃而解。
