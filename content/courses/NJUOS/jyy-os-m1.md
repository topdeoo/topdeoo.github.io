---
title: M1 打印进程树 (pstree) 实验指北
description: 实现一个 pstree 的 shell 小工具（实际是 pstree 的一个阉割版本）
tags:
  - NJU
  - 操作系统
date: 2023-07-27
lastmod: 2024-12-15
draft: false
---

# Lab Configuration

关于实验的配置部分，请看 [实验须知](https://jyywiki.cn/OS/2023/labs/Labs)，而关于 `M1` 部分，请看 [实验文档](https://jyywiki.cn/OS/2023/labs/M1)

简而言之，下载完代码，进入 `pstree` 文件夹后，就可以开始愉快的实验了

> 由于是校外人士写实验，没办法知道自己做的对不对（但感觉是会有地方不对的，比如没有考虑 `crash` 的情况等），并且校外人士并不需要频繁的记录实验过程，所以建议在 `Makefile` 中添加：

```makefile
test:
	gcc -m64 -O -std=gnu11 -ggdb -Wall -Werror ./pstree.c -o a.out
```

> 然后，输入 `./a.out [OPTIONS]...` 即可测试，也可使用 `gdb` 调试

# Lab Procedure

与文档中的指南一致，步骤分为：

1. 得到命令行的参数，根据要求设置标志变量的数值；
2. 得到系统中所有进程的编号 (每个进程都会有唯一的编号) 保存到列表里；
3. 对列表里的每个编号，得到它的的父亲是谁；
4. 在内存中把树建好，按命令行参数要求排序；
5. 把树打印到终端上。

但我在这里并没有排序的过程（当作是自己偷懒了，在打印的时候就已经是按照 `pid` 的顺序排好的），所以我的过程是：

1. 解析命令行参数
2. 获取所有进程的信息（打印所需要的，例如 `pid`, `ppid`, `name` 等）
3. 排列进程，建立父子关系
4. 使用 `dfs` 打印进程树

## Parsing CMD Parameter

要求为：

- `-p`  或  `--show-pids`: 打印每个进程的进程号。
- `-n`  或  `--numeric-sort`: 按照 pid 的数值从小到大顺序输出一个进程的直接孩子。
- `-V`  或  `--version`: 打印版本信息。

实际上，我们可以参考真实 `Linux` 下的 `pstree`：
![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230729214450.png)

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230729214530.png)

其实可以发现，不论我们是否加入 `-n` 选项，打印出来的数据就是按照 `pid` 的大小顺序排列的。

于是， `main` 函数是显然的

```c
#include <assert.h>
#include <dirent.h>
#include <malloc.h>
#include <stdio.h>
#include <string.h>
#include <sys/types.h>

static short version = 0, show_pid = 0, sort_order = 0;

int main(int argc, char *argv[]) {

  for (int i = 1; i < argc; i++) {
    assert(argv[i]);

    if (!strcmp(argv[i], "-V") || !strcmp(argv[i], "--version")) {
      version = 1;
    } else if (!strcmp(argv[i], "-p") || !strcmp(argv[i], "--show-pids")) {
      show_pid = 1;
    } else if (!strcmp(argv[i], "-n") || !strcmp(argv[i], "--numeric-sort")) {
      sort_order = 1;
    } else {
      fprintf(stderr, "Usage: pstree [Options]...\n\t-V, --version\t\t"
                      "Display version information and exit.\n\t-p, "
                      "--show-pids\t\tShow PIDs.\n\t-n, --numeric-sort\t"
                      "Sort output by PID.\n");
      return 1;
    }
  }
  assert(!argv[argc]);

  eval();

  return 0;
}

```

注意

1. 这里我们使用了 `fprintf` 而不是 `printf`，在参数输入错误或无法处理时，我们需要将信息写入标准错误输出而非标准输出，`printf` 是输出到标准输出中的。
2. 我们遍历参数的循环从 `1` 开始而非 `0`，这是因为第一个参数是程序本身，例如 `./a.out -V`，其 `argv[0]` 为 `<abs-path of a.out>`
3. 记得在处理参数时加入断言，保证处理的不错，断言的作用请看 jyy 的课程（大约是调试理论那节课）

## EVAL

解析完参数后，我们步入执行过程，我在这里将过程分为如下部分：

```c
void eval() {

  if (version) {
    fprintf(stderr, "pstree 1.0\nCopyright © 2023 Virgil\n");
    return;
  }

  get_all_procs();
  print_tree(get_proc(1), 0);
}

```

注意，这里打印的版本信息应该为 `stderr` 而非 `stdout`，考虑文档上的提示：

> **在 Hard Test 上 Wrong Answer？**
> 试一试  `pstree -V > /dev/null`，你会发现输出并没有到  `/dev/null`。我们希望你的行为和系统中的  `pstree -V`  基本一致：输出到正确的输出流、包含  `pstree`  的基本信息，但版本描述可以不同。

我们知道 `>` 是将标准输出重定向，`2>` 是重定向标准错误输出，因此这里应该为 `stderr`

## Get All Processes

我们需要从文件系统中（实际上就是 `procfs`）中取得我们需要的进程数据，包括：

1. `pid`
2. `ppid`
3. `name[]`

然而，考虑后续的 `dfs` 打印的过程，我们希望父进程能够知道子进程的 `pid`，这样才方便我们进行递归，因此，我们在这里加入两个字段： ^762ea1

1. `cpid[]`
2. `cpid_num`

这样就形成了我们需要打印的进程结构体：

```c
struct my_proc {
  pid_t pid;
  pid_t ppid;
  short cpid[MAX_PROC];
  short cpid_num;
  short vis;
  char name[64];
};
```

接着，我们考虑如何从文件系统中查询，在文档中有示例，当然，也可以去查看 `pstree` 命令的系统调用过程（我们只需要看 `read` 调用即可），例如：
![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230729220912.png)
可以发现，读取的文件为 `/proc/$pid/stat`，读取的字段的含义可以询问 `GPT` 或 `RTFM`，下面给出解释：
`/proc/$pid/stat` 文件包含了一个长字符串，其中包含了许多字段，它们以空格分隔。下面是各个字段的含义：

1. 进程 ID（PID）：进程的唯一标识符。
2. 进程名称（comm）：进程的名称，通常是可执行文件的名称。
3. 进程状态（state）：进程的状态，包括 R（运行）、S（睡眠）、D（不可中断的睡眠，通常是在等待硬件设备响应时）、T（停止或跟踪）等。
4. 父进程 ID（ppid）：父进程的进程 ID。
5. 进程组 ID（pgrp）：进程所属的进程组 ID。
6. 会话 ID（session）：进程所属的会话 ID。
7. 终端控制进程 ID（tty_nr）：进程所使用的终端设备的进程 ID。
8. 进程组 ID（tpgid）：进程所属的前台进程组 ID。
9. 进程 flags（flags）：进程的标志位，包括很多不同的标志，例如是否使用了超级用户权限等。
10. 运行时间（utime）：进程在用户态运行的时间，以时钟滴答为单位。
11. 系统时间（stime）：进程在内核态运行的时间，以时钟滴答为单位。
12. 子进程用户态运行时间（cutime）：进程所有子进程在用户态运行的时间，以时钟滴答为单位。
13. 子进程内核态运行时间（cstime）：进程所有子进程在内核态运行的时间，以时钟滴答为单位。
14. 优先级（priority）：进程的优先级。
15. 实时优先级（nice）：进程的实时优先级。
16. 处理器编号（num_threads）：进程所使用的处理器数量。
17. 开始时间（start_time）：进程启动的时间，以时钟滴答为单位。
18. 虚拟内存大小（vsize）：进程使用的虚拟内存的大小。
19. 物理内存大小（rss）：进程使用的物理内存的大小，以页面为单位。
20. 软限制（rlim）：进程的软资源限制。
21. 硬限制（rlim）：进程的硬资源限制。

显然，我们只需要 1, 2, 4 三个字段。根据文档中的框架，代码如下：

```c
void get_all_procs() {
  DIR *proc_dir = opendir("/proc");
  struct dirent *proc_entry;
  assert(proc_dir);
  while ((proc_entry = readdir(proc_dir))) {

    if (proc_entry->d_name[0] >= '0' && proc_entry->d_name[0] <= '9') {
      char proc_path[32];
      sprintf(proc_path, "/proc/%.8s/stat", proc_entry->d_name);
      FILE *proc_stat = fopen(proc_path, "r");
      assert(proc_stat);

      struct my_proc *proc = (struct my_proc *)malloc(sizeof(struct my_proc));
      proc->vis = 0;
      fscanf(proc_stat, "%d %s %*c %d", &proc->pid, proc->name, &proc->ppid);
      fclose(proc_stat);

      // do something
    }
  }

  closedir(proc_dir);
}
```

读取完所需要的信息后，接下来需要考虑的就是如何将信息存储起来，方便后续递归打印或是建树的时候使用。

正如之前所说 [[#^762ea1]]，我们需要在这里记录子进程，并且在`dfs`时需要快速查找到子进程，这种数据结构显然是哈希表，因此，我们构建一个 `hash_table` 来帮助我们进行存储：

```c
struct my_proc *hash_table[MAX_PROC] = {NULL};

int hash(pid_t pid) { return pid % MAX_PROC; }

void insert_proc(struct my_proc *proc) {
  int index = hash(proc->pid);
  while (hash_table[index] != NULL) {
    index = (index + 1) % MAX_PROC;
  }
  hash_table[index] = proc;
}

struct my_proc *get_proc(pid_t pid) {
  int index = hash(pid);
  while (hash_table[index]->pid != pid) {
    index = (index + 1) % MAX_PROC;
  }
  return hash_table[index];
}

short get_idx(pid_t pid) {
  int index = hash(pid);
  while (hash_table[index]->pid != pid) {
    index = (index + 1) % MAX_PROC;
  }
  return index;
}

```

这里我们采用线性探测法解决哈希冲突（但实际上桶的大小应该完全够用），于是，我们在 `do something` 中进行存储，并记录进程的子进程：

```c
insert_proc(proc);
if (proc->ppid != 0) {
	struct my_proc *parent = get_proc(proc->ppid);
	parent->cpid[parent->cpid_num++] = get_idx(proc->pid);
}
```

注意，这里 `cpid` 中记录的实际上是子进程在 `hash_table` 中的索引，而非子进程的 `pid`

## Print Processes Tree

这部分的 `dfs` 是 `trival` 的，直接放代码：

```c
void print_tree(struct my_proc *proc, int depth) {
  proc->vis = 1;
  if (show_pid == 0) {
    printf("%*s--%s\n", depth * 2, " ", proc->name);
  } else {
    printf("%*s--%s< %d >\n", depth * 2, " ", proc->name, proc->pid);
  }
  if (proc->cpid_num == 0) {
    free(proc);
    printf("\n");
    return;
  }

  for (int i = 0; i < proc->cpid_num; i++) {
    struct my_proc *child = hash_table[proc->cpid[i]];
    if (child->vis == 0) {
      print_tree(child, depth + 1);
    }
  }
}
```

考虑是 `dfs` 所以加入了 `vis`，但感觉实际上不加也不会有错误，毕竟每个进程一定只会被遍历一次。

最后，我们只需要从 `pid = 1` 的 `init` 开始遍历即可。

# Lab Submit

没办法交到 `OJ` 上，所以只能自己在自己的电脑上试了，多半是没什么太大问题：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230729222905.png)
