---
title: 2020 OS_HW1 shell
description: 实现一个简易版的Shell，可以识别一些简单到不能再简单的命令（bushi
tags:
  - ECNU
  - 操作系统
date: 2022-03-29
lastmod: 2024-12-15
draft: false
---

# 实验目的

在 MINIX 环境下通过系统调用实现一个基本的 Shell。

# 内容与设计思想

Shell 能解析的命令行如下:

1. 带参数的程序运行功能。 `program arg1 arg2 ... argN `

2. 重定向功能，将文件作为程序的输入/输出。

   1. “`>`”表示覆盖写 `program arg1 arg2 ... argN > output-file `
   2. “`>>`”表示追加写 `program arg1 arg2 ... argN >> output-file `
   3. “`<`”表示文件输入 `program arg1 arg2 ... argN < input-file `

3. 管道符号“`|`”，在程序间传递数据。

```shell
  programA arg1 ... argN | programB arg1 ... argN
```

4. 后台符号 `&`，表示此命令将以后台运行的方式执行。

```shell
 program arg1 arg2 ... argN &
```

5. 工作路径移动命令 `cd`。

6. 程序运行统计 `mytop`。

7. shell 退出命令 `exit`。

8. `history n` 显示最近执行的 n 条指令。

# 使用环境

开发环境：VS Code (GNU) + VS2019 (MSVC)

宿主机系统环境：Windows10 + WSL2（Ubuntu 20.04）

虚拟机应用：VMware WorkStation16

虚拟机环境：MINIX3

四、实验过程

![算法流程](https://s2.loli.net/2022/04/02/bTO4Rjy3vUdrSAQ.png)

# Shell 实验过程

## Shell 主体的实现

通过实验文档的描述，我们可以知道，Shell 主函数的作用只是用来打印命令提示符，接收输入的命令，在接收到 `exit` 命令前都会一直运行下去，因此，`main` 函数是显然的：

```c
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <fcntl.h>
#include <signal.h>


#define MAX_COMMAND_LENGTH 1024 /* maximum length of each command */
#define MAX_COMMAND_NUM 512 /* maximum number of commands */


char command[MAX_COMMAND_NUM][MAX_COMMAND_LENGTH]; /* input command history */
int cnt = 0; /* number of input commands */

int
main(int argc, char** argv) {
    char cmdline[MAX_COMMAND_LENGTH]; /* input command */
    while (1) {
        printf("%s:/# ", getcwd(NULL, NULL));
        while (fgets(cmdline, MAX_COMMAND_LENGTH, stdin) == NULL) {
            printf("$\t\n");
        }
        strcpy(command[cnt++], cmdline);
        eval(cmdline);
    }
}

```

此处，由于我们需要实现 `history` 命令，因此需要一个全局变量用以保存历史输入的所有命令。

有关实现命令的所有细节，都在 `eval` 函数中实现。

## 内置命令的实现（`cd`, `history n`, `exit`)

通过 `csapp` 中 [[shelllab|Shell Lab]] 的启发，我们采用了与该实验中相似的函数结构，即：

1. 使用 `eval` 函数来执行命令
2. 使用 `parse_cmd` 函数来分隔命令行
3. 使用 `bulitin_cmd` 函数来实行内置命令

`eval` 函数的结构很简单，即，若命令是内置命令，则直接执行，若不是，则进行程序命令的操作。

此版本的代码如下：

```c
void
parse_cmd(char* buf[MAX_COMMAND], const char* cmd) {
    char p[MAX_COMMAND];
    memset(p, 0, sizeof p);
    int i = 0, cnt = 0, j = 0;
    while (cmd[i] != '\0') {
        while (cmd[i] != ' ' && cmd[i] != '\n') {
            p[j++] = cmd[i++];
        }
        buf[cnt] = (char*)malloc(sizeof(char) * strlen(p));
        strcpy(buf[cnt], p);
        memset(p, 0, sizeof p);
        j = 0;
        cnt++, i++;
    }
}

int
builtin_cmd(const char* buf[MAX_COMMAND]) {
    if (!strcmp(buf[0], "exit"))
        exit(0);
    else if (!strcmp(buf[0], "cd")) {
        if (chdir(buf[1]))
            printf("Failed To Open Directory %s\n", buf[1]);
        return 1;
    }
    else if (!strcmp(buf[0], "history")) {
        int n = buf[1] == NULL ? cnt - 1 : atoi(buf[1]);
        if (n > cnt) printf("Error: n is too large\n");
        else {
            for (int i = cnt - n; i < cnt; i++)
                printf("%s\n", command[i]);
        }
        return 1;
    }
    else if (!strcmp(buf[0], "mytop")) {
        /*TODO: finish mytop*/
        return 1;
    }
    else
        return 0;
}

void
eval(const char* cmd) {
    char* buf[MAX_COMMAND] = { NULL };
    parse_cmd(buf, cmd);

    if (!builtin_cmd(buf)) {
    	/*TODO:: Program Command*/
    	printf("Error: %s is not a valid command", cmd);
    }
}

```

1. 对于内置命令 `cd` ， 我们可以直接调用系统函数 `chdir` 来实现；
2. 对于 `history n` 命令，由于 `n` 是可选的，于是我们需要对此参数进行判断，若 `n` 不存在，我们需要输出历史输入的所有命令。
3. 对于 `mytop` 命令，由于完全陌生以及复杂程度较高，于是将此命令放在最后实现。

（针对此处 `parse_cmd` 函数中使用 `malloc` 的解释：由于程序运行时会发生段错误，加上对 `gdb` 调试的不熟练，于是转向使用 ` VS2019` 进行调试，但 `VS` 使用的编译器 `MSVC` 的标准较苛刻，不同于 `GNU`， 只用使用 `malloc` 才不会使程序在中途内存越界而无法观察到逻辑错误的位置）

## 程序命令的实现

首先我们知道，当命令为程序命令时，我们通常所进行的操作时，`fork` 一个子进程，子进程来运行 `exec` 进而执行命令，而后返回父进程，父进程应当等待子进程运行完毕，方可退出。

下面按照实现时的次序来介绍

### `ls`, `grep`, `vi` 命令

对此，我们只需要对 `eval` 函数添加一些细节即可：

```c
void
eval(const char* cmd) {
    char* buf[MAX_COMMAND] = { NULL };
    parse_cmd(buf, cmd);

    if (!builtin_cmd(buf)) {
        if (fork() == 0) {
            if (execvp(buf[0], buf) < 0) {
                printf("Error: %s is not a valid command", cmd);
            }
        }
        else {
            wait(0);
        }
    }
}

```

### 重定向的实现

明确重定向的实质就是将文件标识符映射到标准输入/输出，这就需要用到 `dup` 函数，我们需要先关闭标准输入/输出，随后，使用 `dup` 函数将指定的文件标识符复制到输入/输出。

但在此之前，我们需要对 `parse_cmd` 函数进行一些修改，增加其识别重定向符号与指定文件名称的功能。为了判断命令中是否存在重定向，与记录文件名称，声明一个结构体 `Program_Details` 用于描述输入/输出模式，输入/输出文件名称等细节。

代码如下：

```c
struct Program_Details {
    int param_num; /* Number of parameters */
    int input_mode; /* Input mode 0 for stdin while 1 for file input */
    int output_mode; /* Output mode 0 for stdout , 1 for file output, 2 for concating*/
    char* input_file; /* Input file */
    char* output_file; /* Output file */
};

void
parse_cmd(char* buf[MAX_COMMAND], const char* cmd, struct Program_Details* pd) {
    char p[MAX_COMMAND];
    memset(p, 0, sizeof p);
    int i = 0, cnt = 0, j = 0;
    int input_idx = 0, output_idx = 0;
    while (cmd[i] != '\0') {
        while (cmd[i] != ' ' && cmd[i] != '\n') {
            p[j++] = cmd[i++];
        }

        if (!strcmp(p, "<"))
            pd->input_mode = 1, input_idx = cnt;
        else if (!strcmp(p, ">"))
            pd->output_mode = 1, output_idx = cnt;
        else if (!strcmp(p, ">>"))
            pd->output_mode = 2, output_idx = cnt;

        else {
            buf[cnt] = (char*)malloc(sizeof(char) * strlen(p));
            strcpy(buf[cnt++], p);
        }

        memset(p, 0, sizeof p);
        j = 0, i++;
    }
    if (pd->input_mode == 1) {
        pd->input_file = (char*)malloc(sizeof(char) * strlen(buf[input_idx]));
        strcpy(pd->input_file, buf[input_idx]);
        buf[input_idx] = NULL;
    }
    if (pd->output_mode == 1 || pd->output_mode == 2) {
        pd->output_file = (char*)malloc(sizeof(char) * strlen(buf[output_idx]));
        strcpy(pd->output_file, buf[output_idx]);
        buf[output_idx] = NULL;
    }
    //pd->param_num = cnt;
}

void
eval(const char* cmd) {
    char* buf[MAX_COMMAND] = { NULL };
    struct Program_Details pd;
    int pid;
    parse_cmd(buf, cmd, &pd);

    if (!builtin_cmd(buf)) {
        if ((pid = fork()) == 0) {
            if (pd.input_mode == 1) {
                int fd = open(pd.input_file, O_RDONLY);
                close(STDIN_FILENO);
                dup(fd);
            }
            if (pd.output_mode == 1) {
                int fd = open(pd.output_file, O_WRONLY | O_CREAT);
                close(STDOUT_FILENO);
                dup(fd);
            }
            else if (pd.output_mode == 2) {
                int fd = open(pd.output_file, O_WRONLY | O_APPEND);
                close(STDOUT_FILENO);
                dup(fd);
            }


            if (execvp(buf[0], buf) < 0) {
                printf("Error: %s is not a valid command", cmd);
                exit(0);
            }
        }
        else {
            wait(0);
        }
    }
}

```

考虑到例如 `grep a < res1.txt > res2.txt` 命令的存在，于是设定了两个指针 `idx` 来确定重定向文件的名称，并且将诸如 `>`, `<`, `>>` 等符号与文件名称从命令中剔除，如将命令 `ls -a -l > res.txt` 分解为 `ls -a -l`，只保留其命令部分。

### 后台运行

在 `Process_Details` 中引入一个变量 `bg_fg`，用于表示当前进程运行的位置为前台还是后台。

为此，需要在 `parse_cmd` 函数中增加识别 `&` 的功能。

根据实验要求，更改 `eval` 函数，并增加 `waitfg` 函数，来保证任务的有序进行。

```c
struct Program_Details {
    int param_num; /* number of parameters */
    int bg_fg;/* Background or Foreground flag  0 for foreground  while 1 for background */
    int input_mode; /* Input mode 0 for stdin while 1 for file input */
    int output_mode; /* Output mode 0 for stdout , 1 for file output, 2 for concating*/
    char* input_file; /* Input file */
    char* output_file; /* Output file */
};

void
parse_cmd(char* buf[MAX_COMMAND], const char* cmd, struct Program_Details* pd) {
    char p[MAX_COMMAND];
    memset(p, 0, sizeof p);
    int i = 0, cnt = 0, j = 0;
    int input_idx = 0, output_idx = 0;
    while (cmd[i] != '\0') {
        while (cmd[i] != ' ' && cmd[i] != '\n') {
            p[j++] = cmd[i++];
        }

        if (!strcmp(p, "<"))
            pd->input_mode = 1, input_idx = cnt;
        else if (!strcmp(p, ">"))
            pd->output_mode = 1, output_idx = cnt;
        else if (!strcmp(p, ">>"))
            pd->output_mode = 2, output_idx = cnt;
        else if (!strcmp(p, "&"))
            pd->bg_fg = 1;

        else {
            buf[cnt] = (char*)malloc(sizeof(char) * strlen(p));
            strcpy(buf[cnt++], p);
        }

        memset(p, 0, sizeof p);
        j = 0, i++;
    }
    if (pd->input_mode == 1) {
        pd->input_file = (char*)malloc(sizeof(char) * strlen(buf[input_idx]));
        strcpy(pd->input_file, buf[input_idx]);
        buf[input_idx] = NULL;
    }
    if (pd->output_mode == 1 || pd->output_mode == 2) {
        pd->output_file = (char*)malloc(sizeof(char) * strlen(buf[output_idx]));
        strcpy(pd->output_file, buf[output_idx]);
        buf[output_idx] = NULL;
    }
    pd->param_num = cnt;
}

void
eval(const char* cmd) {
    char* buf[MAX_COMMAND] = { NULL };
    struct Program_Details pd;
    pid_t pid;
    parse_cmd(buf, cmd, &pd);

    if (!builtin_cmd(buf)) {
        if (pd.bg_fg) {
            signal(SIGCHLD, SIG_IGN);
        }
        else {
            signal(SIGCHLD, SIG_DFL);
        }

        if ((pid = fork()) == 0) {
            if (pd.input_mode == 1) {
                int fd = open(pd.input_file, O_RDONLY);
                close(STDIN_FILENO);
                dup(fd);
            }
            if (pd.output_mode == 1) {
                int fd = open(pd.output_file, O_WRONLY | O_CREAT);
                close(STDOUT_FILENO);
                dup(fd);
            }
            else if (pd.output_mode == 2) {
                int fd = open(pd.output_file, O_WRONLY | O_APPEND);
                close(STDOUT_FILENO);
                dup(fd);
            }

            if (pd.bg_fg == 1) {
                int fd = open(BG_PATH, O_RDWR);
                close(STDOUT_FILENO);
                dup(fd);
                close(STDIN_FILENO);
                dup(fd);
            }

            else {
                if (execvp(buf[0], buf) < 0) {
                    printf("Error: %s is not a valid command", cmd);
                    exit(0);
                }
            }
        }
        else {
            if (!pd.bg_fg)
                waitfg(pid);
        }
    }
}

void
waitfg(pid_t pid) {
    int status;
    waitpid(pid, &status, 0);
}

```

### 管道实现

管道的实现历经波折，原本的思路是通过递归，来实现一个流水线式的过程，但发现不行，因为每次设置管道都需要执行一次命令，递归着写会发生父子进程嵌套问题，导致段错误（越界？子进程嵌套卡死导致堆栈溢出），被迫改变思路，循环着进行每一条命令，并在子任务结束后手动结束进程，防止无限嵌套的发生。

但为了从原本的 `buf` 数组中取出每一条命令，设定了一个二维数组指针 `argv` ，其中 `argv[i]` 表示第 `i` 条子命令，通过 `pipeline` 函数来完成这一工作。

显然，还需要对 `Process_Details` 增加两个变量，`pipe_num` 与`pipe_idx` 表示管道的数量与管道的位置（其中首/末位为 `buf` 中命令开始的位置与结束的位置，为了便于 pipeline 函数分割命令）

于是，对 `parse_cmd` 函数进行修改，以保证其可以记录 `pipe_num` 与 `pipe_idx` 。

在此通过循环来实现管道的连接，==除了首末外，将当前的输入端改为前一个的输出端，当前的输出端变为下一个的输入端，但需要关闭当前管道的读端，防止父子进程间的管道交互。==

```c
struct Program_Details {
    int param_num; /* Number of parameters */
    int bg_fg;/* Background or Foreground flag  1 for background  while 0 for foreground */
    int input_mode; /* Input mode 0 for stdin while 1 for file input */
    int output_mode; /* Output mode 0 for stdout , 1 for file output, 2 for concating*/
    char* input_file; /* Input file */
    char* output_file; /* Output file */
    int pipe_idx[MAX_COMMAND_LENGTH / MAX_COMMAND];/* If there is a pipe, this represents the index of each command in the commandline */
    int pipe_num; /* Number of pipe */
};

void
parse_cmd(char* buf[MAX_COMMAND], const char* cmd, struct Program_Details* pd) {
    char p[MAX_COMMAND];
    memset(p, 0, sizeof p);
    int i = 0, cnt = 0, j = 0;
    int input_idx = 0, output_idx = 0;
    int cmd_idx = 1;
    while (cmd[i] != '\0') {
        while (cmd[i] != ' ' && cmd[i] != '\n') {
            p[j++] = cmd[i++];
        }

        if (!strcmp(p, "<"))
            pd->input_mode = 1, input_idx = cnt;
        else if (!strcmp(p, ">"))
            pd->output_mode = 1, output_idx = cnt;
        else if (!strcmp(p, ">>"))
            pd->output_mode = 2, output_idx = cnt;
        else if (!strcmp(p, "&"))
            pd->bg_fg = 1;
        else if (!strcmp(p, "|")) {
            pd->pipe_idx[cmd_idx++] = cnt;
            pd->pipe_num++;
        }

        else {
            buf[cnt] = (char*)malloc(sizeof(char) * strlen(p));
            strcpy(buf[cnt++], p);
        }

        memset(p, 0, sizeof p);
        j = 0, i++;
    }

    if (pd->input_mode == 1) {
        pd->input_file = (char*)malloc(sizeof(char) * strlen(buf[input_idx]));
        strcpy(pd->input_file, buf[input_idx]);
        buf[input_idx] = NULL;
    }
    if (pd->output_mode == 1 || pd->output_mode == 2) {
        pd->output_file = (char*)malloc(sizeof(char) * strlen(buf[output_idx]));
        strcpy(pd->output_file, buf[output_idx]);
        buf[output_idx] = NULL;
    }
    pd->param_num = cnt;
    pd->pipe_idx[cmd_idx] = cnt;
}

void
pipeline(char* argv[MAX_COMMAND][MAX_COMMAND], const char* buf[MAX_COMMAND], struct Program_Details pd) {
    for (int i = 0; i <= pd.pipe_num; i++) {
        for (int j = pd.pipe_idx[i]; j < pd.pipe_idx[i + 1]; j++) {
            argv[i][j - pd.pipe_idx[i]] = (char*)malloc(sizeof(buf[j]));
            strcpy(argv[i][j - pd.pipe_idx[i]], buf[j]);
        }
    }
}

void
eval(const char* cmd) {

    char* buf[MAX_COMMAND] = { NULL };
    struct Program_Details pd = {
        .bg_fg = 0,
        .input_file = NULL,
        .output_file = NULL,
        .input_mode = 0,
        .output_mode = 0,
        .param_num = 0,
        .pipe_num = 0
    };
    pid_t pid;
    parse_cmd(buf, cmd, &pd);

    if (!builtin_cmd(buf)) {

        if (pd.bg_fg) {
            signal(SIGCHLD, SIG_IGN);
        }
        else {
            signal(SIGCHLD, SIG_DFL);
        }

        /* 存在管道的话，执行如下 */
        if (pd.pipe_num > 0) {
            char* argv[MAX_COMMAND][MAX_COMMAND] = { NULL };
            pipeline(argv, buf, pd);
            int p[MAX_COMMAND][2];
            if ((pid = fork()) == 0) {
                for (int i = 0;i <= pd.pipe_num;i++) {
                    pipe(p[i]); /* creat a pipe */
                    if ((pid = fork()) == 0) {
                        if (i == 0) {
                            if (pd.input_mode == 1) {
                                int fd = open(pd.input_file, O_RDONLY);
                                close(STDIN_FILENO);
                                dup(fd);
                            }

                            close(p[i][0]); /* Block input from the parent process*/
                            close(STDOUT_FILENO);
                            dup(p[i][1]);

                        }
                        else if (i == pd.pipe_num) {
                            if (pd.output_mode == 1) {
                                int fd = open(pd.output_file, O_WRONLY | O_CREAT);
                                close(STDOUT_FILENO);
                                dup(fd);
                            }
                            else if (pd.output_mode == 2) {
                                int fd = open(pd.output_file, O_WRONLY | O_APPEND);
                                close(STDOUT_FILENO);
                                dup(fd);
                            }

                            close(p[i - 1][1]);
                            close(STDIN_FILENO);
                            dup(p[i - 1][0]);

                        }
                        else {
                            close(p[i - 1][1]);
                            close(STDIN_FILENO);
                            dup(p[i - 1][0]);
                            close(p[i][0]);
                            close(STDOUT_FILENO);
                            dup(p[i][1]);
                        }
                        if (execvp(argv[i][0], argv[i]) < 0) {
                            printf("Error: %s is not a valid command", *argv[i]);
                            exit(0);
                        }
                    }
                    else {
                        close(p[i][1]);
                        waitfg(pid);
                    }
                }
                exit(0);
            }
            else {
                if (!pd.bg_fg) {
                    waitfg(pid);
                }
            }
        }
        else { /* 无管道时，执行如下 */
            if ((pid = fork()) == 0) {
                if (pd.input_mode == 1) {
                    int fd = open(pd.input_file, O_RDONLY);
                    close(STDIN_FILENO);
                    dup(fd);
                }
                if (pd.output_mode == 1) {
                    int fd = open(pd.output_file, O_WRONLY | O_CREAT);
                    close(STDOUT_FILENO);
                    dup(fd);
                }
                else if (pd.output_mode == 2) {
                    int fd = open(pd.output_file, O_WRONLY | O_APPEND);
                    close(STDOUT_FILENO);
                    dup(fd);
                }

                if (pd.bg_fg == 1) {
                    int fd = open(BG_PATH, O_RDWR);
                    close(STDOUT_FILENO);
                    dup(fd);
                    close(STDIN_FILENO);
                    dup(fd);
                }
                else {
                    if (execvp(buf[0], buf) < 0) {
                        printf("Error: %s is not a valid command", cmd);
                        exit(0);
                    }
                }
            }
            else {
                if (!pd.bg_fg) {
                    waitfg(pid);
                }
            }
        }
    }
}
```

由于初始的设计理念与管道实现不符合，导致了有无管道的代码大多数相似，甚至可以将其合并。

至此，管道功能已实现，经测试，可以实现类似于 `ls -a -l | grep a | grep s | grep c` 这样复杂的管道命令

## `mytop`命令的实现

回到内置命令，将除去 `mytop` 的程序在 `MINIX3` 系统上运行，发现并无 `bug`，于是来实现最后一个命令 `mytop`。

此命令需要输出两个内容：

1. 内存的使用率
2. CPU 的使用率

设置一个任务管理器结构体`Task_Mgr` 以储存需要输出的内容。

对于内存的使用率，很轻易就能够解决。只需要打开 `/proc/meminfo` ，并按照参数的顺序读取，然后计算输出即可。

对于 CPU 的使用率，分为 3 步解决：

1. 通过 `/proc/kinfo` 读取进程与任务的总数量
2. 遍历所有进程的 `psinfo` 文件，获得其 `State` 与 `ticks`
3. 将状态不为 `R` 的进程的 `ticks` 累加起来，得到空闲进程的 `ticks`，通过总 `ticks` 与空闲进程的 `ticks` ，便可以计算得到 CPU 利用率

```c
struct Task_Mgr {
    u_int64_t total_memory; /* Total memory */
    u_int64_t free_memory; /* Free memory */
    u_int64_t cached_memory; /* Cache memory */
    double total_cpu_usage; /* Total CPU usage */
};

/* in builtin_cmd function # TODO # */
    else if (!strcmp(buf[0], "mytop")) {
        struct Task_Mgr tm = {
            .total_memory = 0,
            .free_memory = 0,
            .cached_memory = 0,
            .total_cpu_usage = 0
        };

        char* meminfo[MAX_INFONUM_LENGTH];
        int idx = 0;
        int fd = open(MEM_PATH, O_RDONLY);
        char p[MAX_COMMAND_LENGTH];
        memset(p, 0, sizeof p);
        while (read(fd, p, MAX_COMMAND_LENGTH) > 0);
        char* str = strtok(p, " ");
        while (str) {
            meminfo[idx] = (char*)malloc(sizeof(char) * strlen(str));
            strcpy(meminfo[idx++], str);
            str = strtok(NULL, " ");
        }

        u_int64_t pagesize = (u_int64_t)atoi(meminfo[0]);
        u_int64_t total = (u_int64_t)atoi(meminfo[1]);
        u_int64_t free = (u_int64_t)atoi(meminfo[2]);
        //u_int64_t largest = (u_int64_t)atoi(meminfo[3]);
        u_int64_t cache = (u_int64_t)atoi(meminfo[4]);

        tm.total_memory = (pagesize * total) / 1024;
        tm.free_memory = (pagesize * free) / 1024;
        tm.cached_memory = (pagesize * cache) / 1024;

        printf("Memory Usage:  main memory:%uK  free memory:%uK  cache memory:%uK\n", tm.total_memory, tm.free_memory, tm.cached_memory);

        u_int64_t total_proc = 0;
        fd = open(PROCESS_PATH, O_RDONLY);
        memset(p, 0, sizeof p);
        while (read(fd, p, MAX_COMMAND_LENGTH) > 0);
        str = strtok(p, " ");
        while (str) {
            total_proc += (u_int64_t)atoi(str);
            str = strtok(NULL, " ");
        }

        FILE* fp;
        time_t total_ticks = 0, free_ticks = 0;
        for (int i = 0;i <= total_proc;i++) {
            char ps_path[64], name[256], state, type;
            int version, endtp, blocked, priority;
            time_t ticks;

            sprintf(ps_path, "/proc/%d/psinfo", i);

            if ((fp = fopen(ps_path, "r")) == NULL)
                continue;
            if (fscanf(fp, "%d", &version) != 1) {
                fclose(fp);
                continue;
            }
            if (fscanf(fp, " %c %d", &type, &endtp) != 2) {
                fclose(fp);
                continue;
            }
            if (fscanf(fp, " %255s %c %d %d %d",
                name, &state, &blocked, &priority, &ticks) != 5) {
                fclose(fp);
                continue;
            }

            total_ticks += ticks;
            if (state != 'R')
                free_ticks += ticks;
        }

        tm.total_cpu_usage = 100.0 * (total_ticks - free_ticks) / (1.0 * total_ticks);
        printf("CPU Usage: %.2f\n", tm.total_cpu_usage);

        return 1;
    }
```

但这样的算法并不符合实验最终要求，于是在源码的基础上，选取自己所需要的函数进行修改，由于源码会很长，不单独放在这部分，在体现在最终代码中。

## 最终代码

```c
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <fcntl.h>
#include <signal.h>
#include <dirent.h>


#define MAX_COMMAND_LENGTH 1024 /* maximum length of each command */
#define MAX_COMMAND_NUM 512 /* maximum number of commands */
#define MAX_COMMAND 64 /* maximum number of characters in each command */
#define MAX_INFONUM_LENGTH 20 /* maximum length of number in each info */
#define MEM_PATH "/proc/meminfo" /* path to info of memory */
#define PROCESS_PATH "/proc/kinfo" /* path to info of process */
#define INFOPATH "/proc"
#define BG_PATH "/dev/null" /* background process i/o path */
#define MAXBUF 1024
#define USED 0x1
#define IS_TASK 0x2
#define IS_SYSTEM 0x4
#define BLOCKED 0x8
#define TYPE_TASK 'T'
#define TYPE_SYSTEM 'S'
#define TYPE_USER 'U'
#define STATE_RUN 'R'
#define CPUTIME(m, i) (m & (1L << (i)))


char command[MAX_COMMAND_NUM][MAX_COMMAND_LENGTH]; /* input command history */
int cnt = 0; /* number of input commands */
const char* cputimenames[] = { "user", "ipc", "kernelcall" };
struct proc* proc = NULL, * prev_proc = NULL;
unsigned int nr_procs, nr_tasks;
int nr_total;
int slot;

#define CPUTIMENAMES (sizeof(cputimenames) / sizeof(cputimenames[0]))

struct Program_Details {
    int param_num; /* Number of parameters */
    int bg_fg;/* Background or Foreground flag 1 for background while 0
    for foreground */
    int input_mode; /* Input mode 0 for stdin while 1 for file input */
    int output_mode; /* Output mode 0 for stdout , 1 for file output, 2 for
    concating*/
    char* input_file; /* Input file */
    char* output_file; /* Output file */
    int pipe_idx[MAX_COMMAND_LENGTH / MAX_COMMAND];/* If there is a pipe,
    this represents the index of each command in the commandline */
    int pipe_num; /* Number of pipe */
};

struct Task_Mgr {
    u_int64_t total_memory; /* Total memory */
    u_int64_t free_memory; /* Free memory */
    u_int64_t cached_memory; /* Cache memory */
    double total_cpu_usage; /* Total CPU usage */
};

struct proc {
    int p_flags;
    int p_endpoint;
    pid_t p_pid;
    u_int64_t p_cpucycles[CPUTIMENAMES];
    int p_priority;
    int p_blocked;
    time_t p_user_time;
    int p_memory;
    uid_t p_effuid;
    int p_nice;
    char p_name[20];
};
struct tp {
    struct proc* p;
    u64_t ticks;
};


void eval(const char* cmd); /* exec command */
int builtin_cmd(const char* buf[MAX_COMMAND]); /* builtin command */
void parse_cmd(char* buf[MAX_COMMAND], const char* cmd, struct
    Program_Details* pd); /* split commandline into commands */
void waitfg(pid_t pid); /* wait for foreground process to exit */
void pipeline(char* argv[MAX_COMMAND][MAX_COMMAND], const char*
    buf[MAX_COMMAND], struct Program_Details pd); /* a pipeline for running
    command */
void get_procs();
void parse_dir();
u_int64_t make64(unsigned long lo, unsigned long hi);
void parse_file(pid_t pid);
u_int64_t cputicks(struct proc* p1, struct proc* p2, int timemode);
double get_usage(struct proc* proc1, struct proc* proc2, int cputimemode);


int
main(int argc, char** argv) {
    char cmdline[MAX_COMMAND_LENGTH]; /* input command */
    while (1) {
        printf("%s:/# ", getcwd(NULL, NULL));
        while (fgets(cmdline, MAX_COMMAND_LENGTH, stdin) == NULL) {
            printf("$\t\n");
        }
        strcpy(command[cnt++], cmdline);
        eval(cmdline);
    }
}

void
eval(const char* cmd) {
    char* buf[MAX_COMMAND] = { NULL };
    struct Program_Details pd = {
    .bg_fg = 0,
    .input_file = NULL,
    .output_file = NULL,
    .input_mode = 0,
    .output_mode = 0,
    .param_num = 0,
    .pipe_num = 0
    };
    pid_t pid;
    parse_cmd(buf, cmd, &pd);
    if (!builtin_cmd(buf)) {
        if (pd.bg_fg) {
            signal(SIGCHLD, SIG_IGN);
        }
        else {
            signal(SIGCHLD, SIG_DFL);
        }
        /* 存在管道的话，执行如下 */
        if (pd.pipe_num > 0) {
            char* argv[MAX_COMMAND][MAX_COMMAND] = { NULL };
            pipeline(argv, buf, pd);
            int p[MAX_COMMAND][2];
            if ((pid = fork()) == 0) {
                for (int i = 0; i <= pd.pipe_num; i++) {
                    pipe(p[i]); /* creat a pipe */
                    if ((pid = fork()) == 0) {
                        if (i == 0) {
                            if (pd.input_mode == 1) {
                                int fd = open(pd.input_file, O_RDONLY);
                                close(STDIN_FILENO);
                                dup(fd);
                            }
                            close(p[i][0]); /* Block input from the parent
                            process*/
                            close(STDOUT_FILENO);
                            dup(p[i][1]);
                        }
                        else if (i == pd.pipe_num) {
                            if (pd.output_mode == 1) {
                                int fd = open(pd.output_file, O_WRONLY |
                                    O_CREAT);
                                close(STDOUT_FILENO);
                                dup(fd);
                            }
                            else if (pd.output_mode == 2) {
                                int fd = open(pd.output_file, O_WRONLY |
                                    O_APPEND);
                                close(STDOUT_FILENO);
                                dup(fd);
                            }
                            close(p[i - 1][1]);
                            close(STDIN_FILENO);
                            dup(p[i - 1][0]);
                        }
                        else {
                            close(p[i - 1][1]);
                            close(STDIN_FILENO);
                            dup(p[i - 1][0]);
                            close(p[i][0]);
                            close(STDOUT_FILENO);
                            dup(p[i][1]);
                        }
                        if (execvp(argv[i][0], argv[i]) < 0) {
                            printf("Error: %s is not a valid command",
                                *argv[i]);
                            exit(0);
                        }
                    }
                    else {
                        close(p[i][1]);
                        waitfg(pid);
                    }
                }
                exit(0);
            }
            else {
                if (!pd.bg_fg) {
                    waitfg(pid);
                }
            }
        }
        else { /* 无管道时，执行如下 */
            if ((pid = fork()) == 0) {
                if (pd.input_mode == 1) {
                    int fd = open(pd.input_file, O_RDONLY);
                    close(STDIN_FILENO);
                    dup(fd);
                }
                if (pd.output_mode == 1) {
                    int fd = open(pd.output_file, O_WRONLY | O_CREAT);
                    close(STDOUT_FILENO);
                    dup(fd);
                }
                else if (pd.output_mode == 2) {
                    int fd = open(pd.output_file, O_WRONLY | O_APPEND);
                    close(STDOUT_FILENO);
                    dup(fd);
                }
                if (pd.bg_fg == 1) {
                    int fd = open(BG_PATH, O_RDWR);
                    close(STDOUT_FILENO);
                    dup(fd);
                    close(STDIN_FILENO);
                    dup(fd);
                }
                else {
                    if (execvp(buf[0], buf) < 0) {
                        printf("Error: %s is not a valid command", cmd);
                        exit(0);
                    }
                }
            }
            else {
                if (!pd.bg_fg) {
                    waitfg(pid);
                }
            }
        }
    }
}

void
parse_cmd(char* buf[MAX_COMMAND], const char* cmd, struct Program_Details*
    pd) {
    char p[MAX_COMMAND];
    memset(p, 0, sizeof p);
    int i = 0, cnt = 0, j = 0;
    int input_idx = 0, output_idx = 0;
    int cmd_idx = 1;
    while (cmd[i] != '\0') {
        while (cmd[i] != ' ' && cmd[i] != '\n') {
            p[j++] = cmd[i++];
        }
        if (!strcmp(p, "<"))
            pd->input_mode = 1, input_idx = cnt;
        else if (!strcmp(p, ">"))
            pd->output_mode = 1, output_idx = cnt;
        else if (!strcmp(p, ">>"))
            pd->output_mode = 2, output_idx = cnt;
        else if (!strcmp(p, "&"))
            pd->bg_fg = 1;
        else if (!strcmp(p, "|")) {
            pd->pipe_idx[cmd_idx++] = cnt;
            pd->pipe_num++;
        }
        else {
            buf[cnt] = (char*)malloc(sizeof(char) * strlen(p));
            strcpy(buf[cnt++], p);
        }
        memset(p, 0, sizeof p);
        j = 0, i++;
    }
    if (pd->input_mode == 1) {
        pd->input_file = (char*)malloc(sizeof(char) *
            strlen(buf[input_idx]));
        strcpy(pd->input_file, buf[input_idx]);
        buf[input_idx] = NULL;
    }
    if (pd->output_mode == 1 || pd->output_mode == 2) {
        pd->output_file = (char*)malloc(sizeof(char) *
            strlen(buf[output_idx]));
        strcpy(pd->output_file, buf[output_idx]);
        buf[output_idx] = NULL;
    }
    pd->param_num = cnt;
    pd->pipe_idx[cmd_idx] = cnt;
}

int
builtin_cmd(const char* buf[MAX_COMMAND]) {
    if (!strcmp(buf[0], "exit"))
        exit(0);
    else if (!strcmp(buf[0], "cd")) {
        if (chdir(buf[1]))
            printf("Failed To Open Directory %s\n", buf[1]);
        return 1;
    }
    else if (!strcmp(buf[0], "history")) {
        int n = buf[1] == NULL ? cnt - 1 : atoi(buf[1]);
        if (n > cnt) printf("Error: n is too large\n");
        else {
            for (int i = cnt - n; i < cnt; i++)
                printf("%s", command[i]);
        }
        return 1;
    }
    else if (!strcmp(buf[0], "mytop")) {
        struct Task_Mgr tm = {
        .total_memory = 0,
        .free_memory = 0,
        .cached_memory = 0,
        .total_cpu_usage = 0
        };
        char* meminfo[MAX_INFONUM_LENGTH];
        int idx = 0;
        int fd = open(MEM_PATH, O_RDONLY);
        char p[MAX_COMMAND_LENGTH];
        memset(p, 0, sizeof p);
        while (read(fd, p, MAX_COMMAND_LENGTH) > 0);
        char* str = strtok(p, " ");
        while (str) {
            meminfo[idx] = (char*)malloc(sizeof(char) * strlen(str));
            strcpy(meminfo[idx++], str);
            str = strtok(NULL, " ");
        }
        u_int64_t pagesize = (u_int64_t)atoi(meminfo[0]);
        u_int64_t total = (u_int64_t)atoi(meminfo[1]);
        u_int64_t free = (u_int64_t)atoi(meminfo[2]);
        u_int64_t cache = (u_int64_t)atoi(meminfo[4]);
        tm.total_memory = (pagesize * total) / 1024;
        tm.free_memory = (pagesize * free) / 1024;
        tm.cached_memory = (pagesize * cache) / 1024;
        printf("Memory Usage: main memory:%uK free memory:%uK cache
            memory: % uK\n", tm.total_memory, tm.free_memory, tm.cached_memory);
            int fd2 = open(PROCESS_PATH, O_RDONLY);
        if (fd2 == -1) {
            printf("Error: open kinfo failed\n");
            exit(1);
        }
        char buf[MAXBUF];
        int bufsize;
        bufsize = read(fd2, buf, sizeof(buf));
        if (bufsize == -1) {
            printf("Error: reading kinfo\n");
        }
        else {
            nr_procs = (unsigned int)atoi(strtok(buf, " "));
            nr_tasks = (unsigned int)atoi(strtok(NULL, " "));
            nr_total = (int)(nr_tasks + nr_procs);
            close(fd2);
        }
        get_procs();
        if (prev_proc == NULL)
            get_procs();
        tm.total_cpu_usage = get_usage(prev_proc, proc, 1);
        printf("CPU Usage: %.2f%%\n", tm.total_cpu_usage);
        return 1;
    }
    else
            return 0;
}

void
waitfg(pid_t pid) {
    int status;
    waitpid(pid, &status, 0);
}

void
pipeline(char* argv[MAX_COMMAND][MAX_COMMAND], const char*
    buf[MAX_COMMAND], struct Program_Details pd) {
    for (int i = 0; i <= pd.pipe_num; i++) {
        for (int j = pd.pipe_idx[i]; j < pd.pipe_idx[i + 1]; j++) {
            argv[i][j - pd.pipe_idx[i]] = (char*)malloc(sizeof(buf[j]));
            strcpy(argv[i][j - pd.pipe_idx[i]], buf[j]);
        }
    }
}

void get_procs() {
    struct proc* p;
    int i;
    p = prev_proc;
    prev_proc = proc;
    proc = p;
    if (proc == NULL) {
        proc = (struct proc*)malloc(nr_total * sizeof(proc[0]));
        if (proc == NULL) {
            printf("Usage: Out of memory\n");
            exit(1);
        }
    }
    for (i = 0; i < nr_total; i++)
        proc[i].p_flags = 0;
    parse_dir();
}
u_int64_t make64(unsigned long lo, unsigned long hi) {
    return ((u_int64_t)hi << 32) | (u_int64_t)lo;
}

void parse_file(pid_t pid) {
    char path[MAXBUF], name[256], type, state;
    int version, endpt, effuid;
    unsigned long cycles_hi, cycles_lo;
    FILE* fp;
    struct proc* p;
    int i;
    sprintf(path, "/proc/%d/psinfo", pid);
    if ((fp = fopen(path, "r")) == NULL)
        return;
    if (fscanf(fp, "%d", &version) != 1) {
        fclose(fp);
        return;
    }
    if (fscanf(fp, " %c %d", &type, &endpt) != 2) {
        fclose(fp);
        return;
    }
    slot++;
    if (slot < 0 || slot >= nr_total) {
        fprintf(stderr, "top: unreasonable endpoint number %d\n", endpt);
        fclose(fp);
        return;
    }
    p = &proc[slot];
    if (type == TYPE_TASK)
        p->p_flags |= IS_TASK;
    else if (type == TYPE_SYSTEM)
        p->p_flags |= IS_SYSTEM;
    p->p_endpoint = endpt;
    p->p_pid = pid;
    if (fscanf(fp, " %255s %c %d %d %lu %*u %lu %lu",
        name, &state, &p->p_blocked, &p->p_priority,
        &p->p_user_time, &cycles_hi, &cycles_lo) != 7) {
        fclose(fp);
        return;
    }
    strncpy(p->p_name, name, sizeof(p->p_name) - 1);
    p->p_name[sizeof(p->p_name) - 1] = 0;
    if (state != STATE_RUN)
        p->p_flags |= BLOCKED;
    p->p_cpucycles[0] = make64(cycles_lo, cycles_hi);
    p->p_memory = 0L;
    if (!(p->p_flags & IS_TASK)) {
        int j;
        if ((j = fscanf(fp, " %lu %*u %*u %*c %*d %*u %u %*u %d %*c %*d
            % *u",
            & p->p_memory, &effuid, &p->p_nice)) != 3) {
            fclose(fp);
            return;
        }
        p->p_effuid = effuid;
    }
    else p->p_effuid = 0;
    for (i = 1; i < CPUTIMENAMES; i++) {
        if (fscanf(fp, " %lu %lu",
            &cycles_hi, &cycles_lo) == 2) {
            p->p_cpucycles[i] = make64(cycles_lo, cycles_hi);
        }
        else {
            p->p_cpucycles[i] = 0;
        }
    }
    if ((p->p_flags & IS_TASK)) {
        if (fscanf(fp, " %lu", &p->p_memory) != 1) {
            p->p_memory = 0;
        }
    }
    p->p_flags |= USED;
    fclose(fp);
}

void parse_dir() {
    DIR* p_dir;
    struct dirent* p_ent;
    pid_t pid;
    char* end;
    if ((p_dir = opendir("/proc")) == NULL) {
        exit(1);
    }
    for (p_ent = readdir(p_dir); p_ent != NULL; p_ent = readdir(p_dir)) {
        pid = strtol(p_ent->d_name, &end, 10);
        if (!end[0] && pid != 0)
            parse_file(pid);
    }
    closedir(p_dir);
}
u_int64_t cputicks(struct proc* p1, struct proc* p2, int timemode) {
    int i;
    u64_t t = 0;
    for (i = 0; i < CPUTIMENAMES; i++) {
        if (!CPUTIME(timemode, i))
            continue;
        if (p1->p_endpoint == p2->p_endpoint) {
            t = t + p2->p_cpucycles[i] - p1->p_cpucycles[i];
        }
        else {
            t = t + p2->p_cpucycles[i];
        }
    }
    return t;
}

double get_usage(struct proc* proc1, struct proc* proc2, int cputimemode) {
    int p, nprocs;
    u64_t systemticks = 0;
    u64_t userticks = 0;
    u64_t total_ticks = 0;
    static struct tp* tick_procs = NULL;
    if (tick_procs == NULL) {
        tick_procs = malloc(nr_total * sizeof(tick_procs[0]));
        if (tick_procs == NULL) {
            fprintf(stderr, "Out of memory!\n");
            exit(1);
        }
    }
    for (p = nprocs = 0; p < nr_total; p++) {
        u64_t uticks;
        if (!(proc2[p].p_flags & USED))
            continue;
        tick_procs[nprocs].p = proc2 + p;
        tick_procs[nprocs].ticks = cputicks(&proc1[p], &proc2[p],
            cputimemode);
        uticks = cputicks(&proc1[p], &proc2[p], 1);
        total_ticks = total_ticks + uticks;
        if (!(proc2[p].p_flags & IS_TASK)) {
            if (proc2[p].p_flags & IS_SYSTEM)
                systemticks = systemticks + tick_procs[nprocs].ticks;
            else
                userticks = userticks + tick_procs[nprocs].ticks;
        }
        nprocs++;
    }
    if (total_ticks == 0)
        return 0.0;
    return 100.0 * (userticks + systemticks) / total_ticks;
}

```

# 总结

写完很有成就感，在接触操作系统不足两周的情况下写出一个简单粗糙但还算能跑的 Shell 对我来说的确不算是一件简单的事情。

如上所说，这个 Shell 存在着很多不足，最突出的或许就是最初的设计模式与他所需要实现的功能存在一些冲突.....

这个实验，让人对 Shell 的工作原理没有什么很深入的了解，但是确实对系统调用更加熟悉了，exec 属于是救命函数。
