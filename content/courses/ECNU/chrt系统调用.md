---
title: 2020 OS_HW2 chrt
description: 实现 chrt 系统调用（简易版）
tags:
  - ECNU
  - 操作系统
date: 2022-03-29
lastmod: 2024-12-15
draft: false
---

# 需要修改的文件

M 代表修改，U 代表新建，D 代表删除

- `/src/include/unistd.h` (M)
- `/src/minix/lib/libc/sys/chrt.c` (U)
- `/usr/src/minix/lib/libc/sys/Makefile.inc` (M)

- `/src/minix/servers/pm/proto.h` (M)
- `/src/minix/servers/pm/chrt.c` (U)
- `/src/minix/include/minix/callnr.h` (M)
- `/src/minix/servers/pm/Makefile` (M)
- `/src/minix/servers/pm/table.c` (M)
- `/src/minix/include/minix/syslib.h` (M)
- `/src/minix/lib/libsys/sys_chrt.c` (U)
- `/src/minix/lib/libsys/Makefile` (M)

- `/src/minix/kernel/system.h` (M)
- `/src/minix/kernel/system/do_chrt.c` (U)
- `/src/minix/kernel/system/Makefile` (M)
- `/src/minix/include/minix/com.h` (M)
- `/src/minix/kernel/config.h`(M)
- `/src/minix/kernel/system.c` (M)
- `/src/minix/commands/service/parse.c` (M)

- `/src/minix/kernel/proc.h`(M)
- `/src/minix/kernel/proc.c`(M)

# 应用层

首先，根据文档要求：

![说明文档](https://s2.loli.net/2022/04/11/5vWOTcFPtBrfJoi.png)

准备工作：先在 `/src/include/unistd.h` 与 `/src/minix/lib/libc/sys/Makefiles.inc` 中添加 `int chrt(long)` 与 `chrt.c`，并在 `/src/minix/lib/libc/sys` 中新增文件 `chrt.c`

![添加声明](https://s2.loli.net/2022/04/11/blOQIroEgpNH68d.png)

![添加到Makefile](https://s2.loli.net/2022/04/11/FEmPAvZ56eDHxnQ.png)

随后，根据文档中对函数的说明与要求：

![说明文档](https://s2.loli.net/2022/04/11/YLUeRJoZQ6XubIy.png)

我们知道，函数 `int chrt(long)` 输入的参数 `deadline` 是指进程运行的时长，在此函数值，我们需要做的事情有三件：

1. 设置 `alarm`
2. 将 `deadline` 设置为进程的终止时间
3. 通过 `MINIX` 的 `IPC` 通信机制（通过`message`结构体来传输信息），将 `deadline` 传到服务层

按照这个步骤来写 `chrt` 函数，我们首先需要知道 `alarm` 的工作原理与调用方法（_见《UNIX 环境高级编程》10.10_）：

```c
#include <unistd.h>

unsigned int alarm(unsigned int seconds);
```

当调用这个函数开始，可以设置一个定时器，持续 `seconds` 秒，当超过这个时间时，产生一个 `SIGALRM` 信号，若忽略或不捕捉这个信号，则默认动作是终止调用 `alarm` 函数的进程。

而这里 `seconds` 的类型是 `unsigned int` ，`deadline` 类型却是 `long`，为防止一些类型不匹配而可能带来的错误，我们在一开始就应当对 `deadline` 的大小进行判断，于是得到代码如下：

```c
/* int chrt(long); */
int chrt(long deadline){
    if(deadline <= 0)
        return 0; /* syscall error */
    alarm((unsigned int)deadline);
    return 1;
}
```

接下来进行第二步，若想知道进程的实际终止时间，显然，我们必须要得到当前时间，这里用 `t` 来表示。

我们可以通过系统调用 `clock_getttime` （ 同目录下的`\src\minix\lib\libc\sys\clock_gettime.c`）来获得系统的当前时间，并将其加上 `deadline` 即可得到进程实际的终止时间。

阅读 `\src\minix\lib\libc\sys\clock_gettime.c` 的源码：

```c
int clock_gettime(clockid_t clock_id, struct timespec *res)
{
  message m;

  memset(&m, 0, sizeof(m));
  m.m_lc_pm_time.clk_id = clock_id;

  if (_syscall(PM_PROC_NR, PM_CLOCK_GETTIME, &m) < 0)
  	return -1;

  res->tv_sec = m.m_pm_lc_time.sec;
  res->tv_nsec = m.m_pm_lc_time.nsec;

  return 0;
}

```

显然，我们需要找到 `timespec` 的定义，经过一番查找，发现他在`\src\sys\sys\time.h` 中，定义描述为：

```c
/*
 * Structure defined by POSIX.1b to be like a timeval.
 */
struct timespec {
	time_t	tv_sec;		/* seconds */
	long	tv_nsec;	/* and nanoseconds */
};
```

那么回去看 `clock_gettime` 就能大概明白一些内容，当然还是会有一些不太明白，比如参数 `clock_id` 的含义，在《UNIX 环境高级编程》 P687 可以找到定义：

- CLOCK_REALTIME：系统实时时间，随系统实时时间改变而改变，即从 UTC 1970-1-1 0:0:0 开始计时，中间时刻如果系统时间被用户改成其他，则对应的时间相应改变。
- CLOCK_MONOTONIC：从系统启动这一刻起开始计时，不受系统时间被用户改变的影响。
- CLOCK_PROCESS_CPUTIME_ID：本进程到当前代码系统 CPU 花费的时间。
- CLOCK_THREAD_CPUTIME_ID：本线程到当前代码系统 CPU 花费的时间

可以看看 wiki 来了解这些参数的意义。

由于参数 `deadline` 表示的是秒，于是我们只需要这里的成员变量 `tv_sec`，那么可得到代码如下：

```c
/* int chrt(long); */
int chrt(long deadline){
    /* other code omitted */
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    deadline = t.tv_sec + deadline;
}
```

最后，我们只需要将 `deadline` 通过信息传递到服务层即可，源码可以发现都使用了 `message` 这一数据类型，寻找 `message` 类型的定义：

`\src\minix\include\minix\ipc.h`

由于定义太长，就不贴出来了。我们知道，现在的 `deadline` 已经变为表示进程实际结束的时间了，于是我们只需要使 `message` 中的某个成员等于 `deadline`，再通过 `_syscall()` 传递信息即可。

可以在 MINIX 的 wiki 上找到关于 Message 结构体的一些描述，也可以自己硬看(wiki 上也有 message 定义的文件的地址）。这里选择联合体中的一个成员来传递`deadline` ，为了防止由于类型转换带来的一些可能的问题（一直在说的），最好找类型也是 `long` 的成员，并且必须在 `mess_1` ~`mess_10`中寻找（后续带有名字的可能有其他作用）。

可以选`mess_2`,`mess_4`,`mess_10`，综合后续还需要传递 `endpoint` 类型的数据，这里选择`mess_2`中的`m2l1/m2l2`。通过 2263 行开始的宏定义，我们可以简写为`m2_l1/m2_l2`，于是，代码如下：

```c
/* int chrt(long); */
int chrt(long deadline){
    /* other code omitted */
    message m;
    memset(m, 0, sizeof(m));
    m.m2_l1 = deadline;
    return _syscall(PM_PROC_NR, PM_CHRT, &m);
}
```

自此，应用层的 `chrt` 函数就已经结束，仿照源码的代码风格，我们修改后如下：

```c
#include <sys/cdefs.h>
#include "namespace.h"
#include <lib.h>

#include <string.h>
#include <unistd.h>
#include <sys/time.h>

// #ifdef __weak_alias
// __weak_alias(chrt, _chrt)
// #endif

int chrt(long deadline) {
    message m;

    memset(&m, 0, sizeof(m));
    if (deadline <= 0)
        return 0;

    alarm((unsigned int)deadline);
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    deadline = t.tv_sec + deadline;

    m.m2_l1 = deadline;
    return _syscall(PM_PROC_NR, PM_CHRT, &m);
}
```

# 服务层

首先根据文档，修改文件：

![说明文档](https://s2.loli.net/2022/04/11/2jOqWMKywusCrde.png)

添加定义 `int do_chrt(void);`、 `#define PM_CHRT		(PM_BASE + 48)` 、`chrt.c`

![添加声明](https://s2.loli.net/2022/04/11/1pSPdIA2Uz9EGrm.png)

![添加宏定义](https://s2.loli.net/2022/04/11/tpmowZjIbSg2CQX.png)

![添加到Makefile](https://s2.loli.net/2022/04/11/uCoFbOEq4ryAd5J.png)

根据文档说明，添加函数实现：

![说明文档](https://s2.loli.net/2022/04/11/eO2z9KibAh4CNop.png)

我们可以在同目录下的 `glo.h` 文件中找到关于 `who_p`等类型的定义：

```c
/* The parameters of the call are kept here. */
EXTERN message m_in;		/* the incoming message itself is kept here. */
EXTERN int who_p, who_e;	/* caller's proc number, endpoint */
EXTERN int call_nr;		/* system call number */
```

由于`sys_chrt`需要参数`deadline`，而我们在应用层中将 `deadline` 放进了 `m2_l1`中，于是：

```c
#include "pm.h"
#include <signal.h>
#include <sys/time.h>
#include <minix/com.h>
#include <minix/callnr.h>
#include "mproc.h"

int do_chrt(void){
    sys_chrt(who_p, m_in.m2_l1);

    return OK;
}
```

(用 OK 的原因是因为此目录下其他的.c 文件都是这样 return 的.....)

然后开始对着步骤改文件

![说明文档](https://s2.loli.net/2022/04/11/pixYSU95OwlI68D.png)

![添加映射](https://s2.loli.net/2022/04/11/mYCBRjvkV42wDHz.png)

![添加声明](https://s2.loli.net/2022/04/11/Y4UybjVAO2ZLR9E.png)

![添加到Makefile](https://s2.loli.net/2022/04/11/5QcHYAStosyVXvn.png)

`sys_chrt.c`代码如下：

```c
#include "syslib.h"

int sys_chrt(proc_ep, deadline)
endpoint_t proc_ep;
long deadline;
{
    message m;
    int r;

    m.m2_i1 = proc_ep;
    m.m2_l1 = deadline;
    r = _kernel_call(SYS_CHRT, &m);
    return r;
}

```

这里使用 `m2_i1` 是因为 `endpoint_t` 类型是 4 字节的数，这在 [Message Wiki](https://wiki.minix3.org/doku.php?id=developersguide:messagepassing#:~:text=Message passing is Minix's native form of IPC.,of them at a higher level of abstraction.)中详细介绍了，因此这里可以使用 int 类型的 m2_i1 来记录此变量

事实上我认为，应该选用 unsigned int 类型来记录，可惜没有这样的成员....

# 内核层

先把要改要加的东西弄完

![说明文档](https://s2.loli.net/2022/04/11/WVaUdsQ9GqMlu1z.png)

![说明文档](https://s2.loli.net/2022/04/11/MpDboQ8ZAJsqxrB.png)

![添加声明](https://s2.loli.net/2022/04/11/2RokhUZ7jO8t9az.png)

![添加到Makefile](https://s2.loli.net/2022/04/11/14V8sIjwnGQqFat.png)

![添加宏定义](https://s2.loli.net/2022/04/11/N5JIPGQgD4h26ER.png)

![添加映射](https://s2.loli.net/2022/04/11/ilDScPsnyMUzRFG.png)

需要注意的是，由`system.h`和`do_fork.c`中的`IF USE_CHRT`和`IF USE_FORK`知，应在某一.h 文件中定义该条目，在同目录下找寻发现，我们还需要在 `config.h` 文件中定义 `USE_CHRT` 为 1

![添加宏定义](https://s2.loli.net/2022/04/11/vhtl6S7ZgBEGoKm.png)

修改完后，根据文档说明编写`do_chrt`函数：

![说明文档](https://s2.loli.net/2022/04/11/FBs52xzgkJ1umNS.png)

由于我们的参数中含有`struct proc`，因此我们还需要去阅读 `proc.h` 中关于 `proc` 的定义，可以在 `proc.h` 中找到 `proc_addr`的的定义，根据文档说明，`do_chrt.c`文件如下：

```c
#include "kernel/system.h"
#include "kernel/vm.h"
#include <signal.h>
#include <string.h>
#include <assert.h>

#include <minix/endpoint.h>
#include <minix/u64.h>

#if USE_CHRT

/*===========================================================================*
 *				do_chrt				     *
 *===========================================================================*/
int do_chrt(struct proc* caller, message* m_ptr) {
    struct proc* p;

    p = proc_addr(m_ptr->m2_i1);
    p->deadline = m_ptr->m2_l1;

    return OK;
}


#endif /* USE_CHRT */
```

# 进程调度

根据文档，我们需要修改几个函数，进而修改判断进程优先级的判定法则：

![说明文档](https://s2.loli.net/2022/04/11/49vAGqTu2BQFe5k.png)

![添加成员变量](https://s2.loli.net/2022/04/11/PqSzWjmtsEXHv3Z.png)

优先级的判定为：最早 deadline 的用户进程相对于其它用户进程具有更高的优先级，从而被优先调度运行。

可以发现在 `proc.h` 中可以找到成员 `  char p_priority;` 用于记录优先级，在 `\src\minix\include\minix\config.h`中可以找到最高优先级为 0，于是，我们便可以开始修改一些函数

首先，进入函数 `switch_to_user()`，阅读注释可以很好的理解代码

先更改 `enqueue_head()` 中关于优先级的定义，阅读注释，可知`rp`为正在运行的进程，需将其按照优先级加入队列

![需要更改的函数](https://s2.loli.net/2022/04/11/Ldocre6POKY9Bnt.png)

于是我们将所有`deadline > 0`的进程优先级全部设为 5（经尝试，优先级为 01234 时无法正确实现进程调度，推测应为属于内核层的进程的优先级）

```c
if (rp->deadline > 0)
    rp->p_priority = 5;
const int q = rp->p_priority;	 		/* scheduling queue to use */
```

随后更改 `enqueue()` 中关于优先级的定义，与上面的做法相同

最后更改`pick_proc()`中对于相同优先级下进程的选择，由于设置了 deadline 的进程优先级都为 5，这些进程组成了一个列表，这里通过`proc.h`中可以看出来：

```c
struct proc* p_nextready;  /* pointer to next ready process */
```

于是我们通过遍历优先级为 5 的进程组成的列表，选择出设置了 deadline 并且 deadline 的值最小的进程，过程中需要对这些进程进行判断是否可运行（`proc_is_runnable()`)，最后返回这个选择的进程

```c
for (q=0; q < NR_SCHED_QUEUES; q++) {
	if(!(rp = rdy_head[q])) {
		TRACE(VF_PICKPROC, printf("cpu %d queue %d empty\n", cpuid, q););
		continue;
	}
	assert(proc_is_runnable(rp));
	struct proc* t;
	if (q == 5) {
    	t = rp->p_nextready;
		while(t){
			if (t->p_deadline > 0 &&
                (!rp->p_deadline || t->p_deadline < rp->p_deadline))
                if (proc_is_runnable(t))
        			rp = t;
    		t = t->p_nextready;
		}
  	}
	if (priv(rp)->s_flags & BILLABLE)
		get_cpulocal_var(bill_ptr) = rp; /* bill for system time */
	return rp;
}
```

# 编译并运行 test-2

`test-2` 如下所示：

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <signal.h>
#include <sys/wait.h>
#include <sys/types.h>
#include <lib.h>
#include <time.h>

void proc(int id);
int main(void)
{
  //创建三个子进程，并赋予子进程id
  for (int i = 1; i < 4; i++)
  {
    if (fork() == 0)
    {
      proc(i);
    }
  }
  return 0;
}
void proc(int id)
{
  int loop;
  switch (id)
  {
  case 1: //子进程1，设置deadline=25
    chrt(25);
    printf("proc1 set success\n");
    sleep(1);
    break;
  case 2: //子进程2，设置deadline=15
    chrt(15);
    printf("proc2 set success\n");
    sleep(1);
    break;
  case 3: //子进程3，普通进程
    chrt(0);
    printf("proc3 set success\n");
    sleep(1);
    break;
  }
  for (loop = 1; loop < 40; loop++)
  {
    //子进程1在5s后设置deadline=5
    if (id == 1 && loop == 5)
    {
      chrt(5);
      printf("Change proc1 deadline to 5s\n");
    }
    //子进程3在10s后设置deadline=3
    if (id == 3 && loop == 10)
    {
      chrt(3);
      printf("Change proc3 deadline to 3s\n");
    }
    sleep(1); //睡眠，否则会打印很多信息
    printf("prc%d heart beat %d\n", id, loop);
  }
  exit(0);
}

```

需要注意的是，我们需要在 `case 3`的 `printf` 后添加一行 `sleep(1)` 来让测试正常，否则，3 号进程永远会先于 1,2 号进程 $1$ 秒运行。

更改后，测试的结果如下图所示，优先级是正确的。

![运行结果](https://s2.loli.net/2022/04/11/M8C1LIx9aNVrlbS.png)
