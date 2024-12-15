---
title: Lab4 Trap
description: 2020年的课和这个不太兼容（需要看完中断之后才能做这个实验）
tags:
  - MIT
  - 操作系统
date: 2022-04-19
lastmod: 2024-12-15
draft: false
---

实验难度为 `easy`, `moderate`, `hard`。

第三题需要用到中断的内容（或者说第三题就是中断

前两题应该算是比较简单的类型，看过课（课本可能描述的还不够详细）的话应该很容易就能做出来。

## 实验准备

```bash
git fetch
git checkout traps
make clean
```

得到相应的实验环境

## RISC-V assembly

阅读汇编代码回答问题：

```asm
int g(int x) {
   0:	1141                	addi	sp,sp,-16
   2:	e422                	sd	s0,8(sp)
   4:	0800                	addi	s0,sp,16
  return x + 3;
}
   6:	250d                	addiw	a0,a0,3
   8:	6422                	ld	s0,8(sp)
   a:	0141                	addi	sp,sp,16
   c:	8082                	ret

000000000000000e <f>:

int f(int x) {
   e:	1141                	addi	sp,sp,-16
  10:	e422                	sd	s0,8(sp)
  12:	0800                	addi	s0,sp,16
  return g(x);
}
  14:	250d                	addiw	a0,a0,3
  16:	6422                	ld	s0,8(sp)
  18:	0141                	addi	sp,sp,16
  1a:	8082                	ret

000000000000001c <main>:

void main(void) {
  1c:	1101                	addi	sp,sp,-32
  1e:	ec06                	sd	ra,24(sp)
  20:	e822                	sd	s0,16(sp)
  22:	1000                	addi	s0,sp,32
  printf("%d %d\n", f(8) + 1, 13);
  24:	4635                	li	a2,13
  26:	45b1                	li	a1,12
  28:	00000517          	auipc	a0,0x0
  2c:	7e050513          	addi	a0,a0,2016 # 808 <malloc+0xe4>
  30:	00000097          	auipc	ra,0x0
  34:	636080e7          	jalr	1590(ra) # 666 <printf>
  unsigned int i = 0x00646c72;
  38:	006477b7          	lui	a5,0x647
  3c:	c727879b          	addiw	a5,a5,-910
  40:	fef42623          	sw	a5,-20(s0)
  printf("H%x Wo%s", 57616, &i);
  44:	fec40613          	addi	a2,s0,-20
  48:	65b9                	lui	a1,0xe
  4a:	11058593          	addi	a1,a1,272 # e110 <__global_pointer$+0xd0d7>
  4e:	00000517          	auipc	a0,0x0
  52:	7c250513          	addi	a0,a0,1986 # 810 <malloc+0xec>
  56:	00000097          	auipc	ra,0x0
  5a:	610080e7          	jalr	1552(ra) # 666 <printf>
  exit(0);
  5e:	4501                	li	a0,0
  60:	00000097          	auipc	ra,0x0
  64:	27e080e7          	jalr	638(ra) # 2de <exit>
# ...
0000000000000666 <printf>:

void
printf(const char *fmt, ...)
{
 666:	711d                	addi	sp,sp,-96
 668:	ec06                	sd	ra,24(sp)
 66a:	e822                	sd	s0,16(sp)
 66c:	1000                	addi	s0,sp,32
 66e:	e40c                	sd	a1,8(s0)
 670:	e810                	sd	a2,16(s0)
 672:	ec14                	sd	a3,24(s0)
 674:	f018                	sd	a4,32(s0)
 676:	f41c                	sd	a5,40(s0)
 678:	03043823          	sd	a6,48(s0)
 67c:	03143c23          	sd	a7,56(s0)
  va_list ap;

  va_start(ap, fmt);
 680:	00840613          	addi	a2,s0,8
 684:	fec43423          	sd	a2,-24(s0)
  vprintf(1, fmt, ap);
 688:	85aa                	mv	a1,a0
 68a:	4505                	li	a0,1
 68c:	00000097          	auipc	ra,0x0
 690:	dce080e7          	jalr	-562(ra) # 45a <vprintf>
}
 694:	60e2                	ld	ra,24(sp)
 696:	6442                	ld	s0,16(sp)
 698:	6125                	addi	sp,sp,96
 69a:	8082                	ret
```

1. 哪些寄存器是用于调用函数时存储参数的

2. `main` 函数在什么地方调用了 `f` 与 `g` 函数

3. 函数 `printf` 在什么位置

4. 在 `mian` 中使用 `printf` 后寄存器 `ra` 的值是多少

5. 运行代码

   ```c
   unsigned int i = 0x00646c72;
   printf("H%x Wo%s", 57616, &i);
   ```

   的输出是什么

6. 在下面的代码中，`y` 会输出什么？（不同的电脑得到的值是不一样的）

回答如下：

1. 观察函数`g`的汇编，很显然 `a0` 存放函数的第一个参数，`a2`，`a3`依此类推。返回值存储在 `a0`, `a1` 两个寄存器中

2. 两个函数由于过于简单，都被编译器内联优化了，`main`调用 `f` 时直接将答案计算出来，`f` 内联了 `g` 而非调用
3. `0000000000000666`
4. `jal`是跳转到某个地址同时把返回调用点的地址存储在`$ra`中，`jalr`可以使用相对地址跳转，兼具`jar`的作用。因此`$ra`中存储的就是下一条指令开始的地方`0x38`(当前跳转的地址 address+4)
5. 输出：`He110 World%`，这是因为 RISC-V 使用小端法表示数字，若为大端法则输出`He110 Wo%`; 数字不用改变，因为编译器会使用机器的编码方式做出改变。
6. 会打印出 `a2` 的值，但在 x86-64 机器运行则会输出一个随机数。

## Backtrace

实现一个 `backtrace()` 函数，用于打印函数调用时的返回地址（也就是栈帧地址），方便 `debug` （说是这么说，但是我感觉 `gdb + tui` 比这个香多了）

值得注意的是，实现完这个函数后，需要在 `sys_sleep()` 中调用此函数才行。

其他的就根据官网的 `Hint` 来就行，在对应的文件位置添加对应的条目，例如：

> 1. Add the prototype for backtrace to `kernel/defs.h` so that you can invoke `backtrace` in `sys_sleep`.
>
> 2. The GCC compiler stores the frame pointer of the currently executing function in the register `s0`. Add the following function to `kernel/riscv.h`
>
> ……
>
> 这些都较为基础，所以在这里就省略了。

我们遵照样例中给出的格式，首先打印 `backtrace:`，然后递归地打印调用者的地址

在提示中给出，首先，我们需要去找到当前的栈帧，也就是 `fp`。

随后，我们遍历这个页表，由于返回地址的偏移量为 `-8` ，而上一个函数的栈帧的偏移量为 `-16`（负数是因为栈是向下增长的），如下图所示：

![Stack Frame](https://s2.loli.net/2022/07/06/XAhFkzyU82IReTH.png)

于是，我们的代码如下：

```c
void
backtrace(void) {
  printf("backtarce:\n");
  uint64 fp = r_fp();
  uint64 top = PGROUNDUP(fp), bottom = PGROUNDDOWN(fp);
  while (fp > bottom && fp < top) {
    uint64 res = *(uint64*)(fp - 8);
    printf("%p\n", res);
    fp = *(uint64*)(fp - 16);
  }
}
```

这里给出了一个 `backtrace` 的用处：

将他接口到 `kernel/printf.c` 中的 `panic()` 中去，这样当我们遇到 `bug` 而导致内核陷入 `panic` 时，我们就知道到底是什么地方出现了问题。

## Alarm

> 中断……

一个时钟中断问题

在这部分，我需要记录一下遇到的问题。

我们需要实现两个函数，分别为 `sys_sigalarm()` 与 `sys_sigreturn()`（实际上是两个系统调用，用户空间的函数需要自己去补充，按照添加系统调用的规则来做即可）

第一个函数需要将 `interval` 与 `handler` 存储到当前的 `PCB` 中去（为此我们需要在 `PCB` 中添加存储这些内容的成员）

第二个函数是一个回调函数，具体而言，他需要做的就是恢复执行 `handler` 函数前系统的状态。

然而，提示还告诉我们，我们需要在 `PCB` 中添加当前进程在上一次调用 `sigalarm(interval, handler)` 后经过了多少 `CPU` 时间。

因此，我们的 `PCB` 修改如下：

### 问题：只添加 epc 用于回调函数

首先，问题是我们为什么需要 `epc` 。

在 `kernel/trap.c` 中我们知道，从内核恢复到用户空间，我们需要从 `trapframe` 中恢复陷入内核前的所有寄存器内容，包括 `pc`，而 `pc` 是被存储在 `trapframe` 中的 `epc` 之中的。

于是，可以猜测，如果我们修改 `trapframe` 中的 `epc` 的话，那么当内核调用 `userret()` ，我们就会去调用 `epc` 所指向的内容了，那么回调的时候，显然，我们也只需要将原来用户空间陷入内核时的 `pc` 替换到 `trapframe` 的 `epc` 中来。

```c
struct proc {
  //....
  uint alarm;             // ALarm ticks
  uint64 handler;              // handler function
  uint rest;               // rest ticks
  uint64 epc;             // save pc
};
```

我们的 `sys_sigalarm()` 的任务只是存储用户空间传进的参数，并且我们需要将 `rest` 设置为 `0`：

```c
uint64
sys_sigalarm(void) {
  int n;
  uint64 handler;
  struct proc* p = myproc();
  if (argint(0, &n) < 0 || argaddr(1, &handler) < 0)
    return -1;
  p->alarm = n;
  p->handler = handler;
  p->rest = 0;
  return 0;
}
```

当然，`rest` 在进程刚被创建时，我们就需要将其设置为 `0`

于是在 `kernel/proc.c` 中的 `allocproc()` 中，我们添加如下：

```c
static struct proc*
allocproc(void) {
  struct proc* p;
  // ......

  // Set ticks
  p->rest = 0;

  return p;
}
```

随后，我们需要修改中断的代码，也就是在 `kernel/trap.c` 中的 `if(which_dev == 2)`（代表时钟中断）：

```c
  // give up the CPU if this is a timer interrupt.
  if (which_dev == 2) {
    if (p->alarm) {
      p->rest += 1;
      if (p->rest == p->alarm) {
        p->rest = 0;
        p->epc = p->trapframe->epc;
        p->trapframe->epc = p->handler;
      }
    }
    else {
      yield();
    }
 }
```

`sys_sigreturn()`在 `test0` 中可以什么都不实现就能通过，但对于 `test1/test2` 的话，我们的想法是，我们只需要回复 `pc` 即可：

```c
uint64
sys_sigreturn(void) {
  struct proc* p = myproc();
  p->trapframe->epc = p->epc;
  return 0;
}
```

然而，这样在 `test1` 会导致一个错误：

原因我认为是，我们需要恢复的寄存器并不止是一个 `pc` ，其他 100+个寄存器应该可能都是需要恢复的，那么我们就干脆把原本的 `trapframe` 复制一份存起来，等到回调时再恢复就可以了。

### 正确代码

既然知道错在什么地方，那么我们只需要修改存储的方法即可：

1. 在 `PCB` 中添加一个 `struct trapframe* alarmframe` 用于存储前一次的 `trapframe`
2. 在 `trap.c` 处理时钟中断时，我们将 `trapframe` 复制到 `alarmframe` 中去
3. 在 `sys_sigalarm()` 中，我们需要将 `alarmframe` 设置为 `NULL` 方便在识别此处到底有没有存储数据
4. 在 `sys_sigreturn()` 中，我们将 `alarmframe` 复制到 `trapframe` 中去

代码如下所示：

```c
struct proc {

  // .....
  uint alarm;             // ALarm ticks
  uint64 handler;              // handler function
  uint rest;               // rest ticks
  struct trapframe* alarmframe; // save regs
};
```

```c
  // give up the CPU if this is a timer interrupt.
  if (which_dev == 2) {
    if (p->alarm) {
      p->rest += 1;
      if (p->rest == p->alarm) {
        p->rest = 0;
        if (!p->alarmframe) {
          p->alarmframe = kalloc();
          memmove(p->alarmframe, p->trapframe, 290);
          p->trapframe->epc = p->handler;
        }
      }
    }
    else
      yield();
  }
```

```c
uint64
sys_sigalarm(void) {
  int n;
  uint64 handler;
  struct proc* p = myproc();
  if (argint(0, &n) < 0 || argaddr(1, &handler) < 0)
    return -1;
  p->alarm = n;
  p->handler = handler;
  p->rest = 0;
  p->alarmframe = 0;
  return 0;
}

uint64
sys_sigreturn(void) {
  struct proc* p = myproc();
  if (p->alarmframe) {
    memmove(p->trapframe, p->alarmframe, 290);
    kfree(p->alarmframe);
    p->alarmframe = 0;
  }
  return 0;
}
```

至于这里，为什么 `memmove` 选择 `290` 字节，这是因为在 `kernel/proc.h` 中的 `struct trapframe` 中定义了，`trapframe` 最多到 `280 + 8` 字节，凑个整 `290` 刚好（bushi

这部分可以自行选择，不低于 `280` 即可。

## 实验结果

![grade](https://s2.loli.net/2022/07/04/dg5kRvIUAESoXaZ.png)
