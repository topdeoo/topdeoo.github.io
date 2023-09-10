---
title: MIT 6.S081 lab3 Page Tables
math: true
date: 2022-04-18 12:41:24
cover: https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230628183743.png
tag:
  - OS
  - MIT
category:
  - 关于OS的一些零零碎碎	
  - MIT 6.S081
---

> ​	你说的 easy 不是 easy，我说的 hard 是什么 hard😭

<!--more-->

# Lab03 Page Tables

实验难度 `easy`, `easy`, `hard`。

结果第一题差点把我送走了……MIT，你坏事做尽😭

## 实验准备

把第三章看懂（条件很简单，也很tm难，第三章应该是我目前为止没有把英文原本读完的一章了，实在是看不下去啊😭），可以读中文版，也可以阅读*《现代操作系统：原理与实现》*（处理器架构有所不同但无伤大雅）。

其实把网站上橙色部分都做完就行。

不如给网站：[Lab: page tables (mit.edu)](https://pdos.csail.mit.edu/6.828/2021/labs/pgtbl.html)

请务必完成前置要求，否则你根本不知道应该修改什么（或者是不知道为什么要修改）

还有要记住的就是：`fllow the hints`

## Speed up your system calls

在进程被创建的同时创建一个只读页面，以便内核与用户程序的交互，这样就可以不需要每次系统调用的时候都去请求读写了，典型的一种空间换时间的提高速度的方法。这里只要求优化`getpid()`这个系统调用。

> 官方能不能把函数在那个文件都说一下啊！一个一个去找真的很累啊焯

首先，我们可以《很轻易》的在 `user/ulib.c` 中找到 `ugetpid()` 的定义：

```c
#ifdef LAB_PGTBL
int
ugetpid(void)
{
  struct usyscall *u = (struct usyscall *)USYSCALL;
  return u->pid;
}
#endif
```

会发现这是灰的，但是没事！注意到第一行有一个 `LIB_PGTBL`，也就是当你在做 `PGTBL`这个实验的时候，这个函数是可以被使用的，否则就不行。

分析这个函数，可以发现用了一个 `struct usyscall` ，还好MIT告诉我们在哪里可以找到这个： `kernel/memlayout.h`，我们可以在里面找到一起出现的一个常量 `USYSCALL`。

我们可以发现，这个 `u` 指向的位置就是 `USYSCALL` 的地址，也就是说 `USYSCALL` 处应当存储一个 `struct usyscall` 才可以，根据对 `ugetpid()` 的描述，我们知道 `USYSCALL` 就存在需要我们创建的只读页表之中。

我们查看 `USYSCALL` 的定义：

```c
//   USYSCALL (shared with kernel)
//   TRAPFRAME (p->trapframe, used by the trampoline)
//   TRAMPOLINE (the same page as in the kernel)
#define TRAMPOLINE (MAXVA - PGSIZE)
#define TRAPFRAME (TRAMPOLINE - PGSIZE)
#define USYSCALL (TRAPFRAME - PGSIZE)
```

可以发现 `USYSCALL` 在跳板下两个 `PGSIZE` 的位置（可以看教材中的图来确定位置，虽然这对实验没什么作用）

接下来跟着提示来：

- 可以在 `kernel/proc.c` 中的 `proc_pagetable()` 中执行映射
- 页面必须是只读的（且用户可操作）
- 在 `allocproc()` 初始化进程时，开辟这个页面（初始化）
- 需要在 `freeproc()` 中释放这个页面（当进程被 `kill` 时）

那不妨从开辟页面开始：

```c
static struct proc*
allocproc(void) {
// ...
found:
  // Allocate a trapframe page.
  if ((p->trapframe = (struct trapframe*)kalloc()) == 0) {
    freeproc(p);
    release(&p->lock);
    return 0;
  }

  // Add
  if ((p->usyscall = (struct usyscall*)kalloc()) == 0) {
    freeproc(p);
    release(&p->lock);
    return 0;
  }
  p->usyscall->pid = p->pid;
  // ...
    return 0;
  }
```

这里的代码是仿照开辟 `trapframe` 页面的代码写的，当然，我们在这之前，还需要在 `kernel/proc.h` 中为 `struct proc` 添加一个成员变量 `stryct usyscall* usyscall`，以储存这个页面的地址。

在开辟完页面后，我们还需要将 `pid` 存进这个页面中，也就是 `struct usyscall` 的 `pid` 中。

然后，我们需要将新开辟的页面映射到物理内存上（开辟页面一律指在虚拟内存中开辟），在`proc_pagetable()` 中添加：

```c
pagetable_t
proc_pagetable(struct proc* p) {
  pagetable_t pagetable;
  //...

  // map the trampoline code (for system call return)
  // at the highest user virtual address.
  // only the supervisor uses it, on the way
  // to/from user space, so not PTE_U.
  if (mappages(pagetable, TRAMPOLINE, PGSIZE,
    (uint64)trampoline, PTE_R | PTE_X) < 0) {
    uvmfree(pagetable, 0);
    return 0;
  }
  // ...

  if (mappages(pagetable, USYSCALL, PGSIZE,
    (uint64)(p->usyscall), PTE_R | PTE_U) < 0) {
    uvmunmap(pagetable, TRAPFRAME, 1, 0);
    uvmunmap(pagetable, TRAMPOLINE, 1, 0);
    uvmfree(pagetable, 0);
    return 0;
  }

  return pagetable;
}
```

这里需要注意两点：

1. 由于是只读的，我们需要添加 `PTE_R` ，但注意到注释中有解释，若想在用户空间中调用，需要添加 `PTE_U`
2. 在映射失败时，需要取消映射，但我们需要把前两个都取消了，为什么能想到，不妨看看上面两个 `if` 后面都跟着什么（顺序需要从后往前取消，因为后一个是依赖于前一个的）

最后就是删除这个页面：

```c
static void
freeproc(struct proc* p) {
  if (p->trapframe)
    kfree((void*)p->trapframe);
  p->trapframe = 0;
  
  //Add
  if (p->usyscall)
    kfree((void*)p->usyscall);
  p->usyscall = 0;
  // ...
}
```

同样是仿照如何删除 `trapframe` 页面。但这里我们还需要在 `proc_freepagetable` 中释放页面映射的物理地址：

```c
void
proc_freepagetable(pagetable_t pagetable, uint64 sz) {
  // ...
  // Add
  uvmunmap(pagetable, USYSCALL, 1, 0);
  // ...
}
```

取消虚拟内存到物理内存的映射即可。

> 回答一下网页上的问题：还有哪些系统调用是可以通过这种方式加速的？
>
> 这个问题很简单，这种方法本质上只是内核为用户共享了一个只读页面，因此那些需要读取内核信息的系统调用都可以使用这种方式来加速。

## Print a page table

在 `kernel/vm.c` 中实现一个遍历进程的页表的函数 `vmprint(pagetable_t pagetable)`，当进程的`pid == 1` 时执行。

实现的方式可以参照同文件下的函数 `freewalk()`。

```c
void
vmprint(pagetable_t pagetable, int level) {
  if (!level)
    printf("page table %p\n", pagetable);
  for (int i = 0;i < 512;i++) {
    pte_t pte = pagetable[i];
    if ((pte & PTE_V) && (pte & (PTE_R | PTE_W | PTE_X)) == 0) {
      // this PTE points to a lower-level page table.
      uint64 child = PTE2PA(pte);
      if (level == 0)
        printf("..%d: pte %p pa %p\n", i, pte, child);
      else if (level == 1)
        printf(".. ..%d: pte %p pa %p\n", i, pte, child);
      vmprint((pagetable_t)child, level + 1);
    }
    else if ((pte & PTE_V)) {
      printf(".. .. ..%d: pte %p pa %p\n", i, pte, PTE2PA(pte));
    }
  }
}
```

显然，我们还需要在 `kernel/defs.h` 中注册这个函数。

最后，在 `kernel/exec.c` 中 `return argc` 之前调用即可。(这个难度确实是easy，没骗人)

> Explain the output of `vmprint` in terms of Fig 3-4 from the text. What does page 0 contain? What is in page 2? When running in user mode, could the process read/write the memory mapped by page 1? What does the third to last page contain?
>
> 或许可以画个图来描述？

![Flow Chart](https://s2.loli.net/2022/04/18/JWmSdoN6cHr57La.png)

方框中数字表示索引，长方形的解释可以参见教材中的插图：

![Flow Chart](https://s2.loli.net/2022/04/18/4YIAfNbZHo6Kldg.png)

参照教材中对`PTE`的解释，我们来分析后面的问题：

![Explanation](https://s2.loli.net/2022/04/18/qJWuE1htn3lKvZ4.png)

`0x0000000021fda00f` 分析后十位：`0000001111`，可以发现是可读可写，且可被用户访问的。



## Detecting which pages have been accessed

这个题一点也不 `hard` 。。

从一个用户页表地址开始，搜索所有被访问过的页表并返回一个`bitmap` 来显示这些页是否被访问过（一个比特串，从右往左数，第 $i$ 位若为 $1$ 则代表第 $i$ 个页面被访问过）。

需要在 `kernel/sysproc.c` 中实现这个函数。

当然，我们可以继续跟着提示做（这个题因为有提示所以一点都不难了）

```c
int
sys_pgaccess(void) {
  // lab pgtbl: your code here.
  uint64 buf, abits, ret = 0;
  int size;
  pte_t* pte_addr;
  pte_t pte;
  if (argaddr(0, &buf) < 0 || argaddr(2, &abits))
    return -1;
  if (argint(1, &size) < 0)
    return -1;
  pagetable_t pagetable = myproc()->pagetable;
  for (int i = 0;i < size;i++) {
    pte_addr = walk(pagetable, buf, 0);
    pte = *pte_addr;
    if (pte & PTE_A) {
      *pte_addr = pte & (~PTE_A);
      ret |= (1 << i);
    }
    buf += PGSIZE;
  }
  if (copyout(pagetable, abits, (char*)&ret, sizeof(ret)) < 0)
    return -1;
  return 0;
}
```

主要注意四点：

1. 我们需要在 `kernel/defs.h` 中注册 `walk()` 函数才可以使用（不知道为什么这个函数是存在的但是没被注册）
2. `PTE_A` 这个值是需要在 `kernel/riscv.h` 中定义的，具体是第几位可以看上面关于 `PTE` 中 `FLAGS` 的图。
3. 计数后需要把页面设置为未访问，也就是把那一位设为 `0` ，与上掩码的反码就可以了。
4. 为什么 `ret` 不是自加而是要这么运算呢，请注意要求返回的结果是 `bitmap`。

如果你中途出错的话，或许可以使用`vmprint()`来 `debug`。

## 最终成绩

![Final Grade](https://s2.loli.net/2022/04/18/3GJpcCudH6L42Yy.png)

最后记得 `git add . && git commit -m "finish"`

其实我觉得这部分 `xv6`的教材讲的比较简略，可以看 *《现代操作系统：原理与实现》*做进一步了解（不知道`CSAPP`行不行，我还没看到那）



