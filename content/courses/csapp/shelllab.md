---
title: shell-lab
description: ​不如我自己写的 `shell` 难度大（不过关于信号处理的部分还是很有意思的）
tags: [CMU]
date: 2022-11-03
lastmod: 2024-12-10
draft: false
---

# 实验准备

==仔细阅读== CS:APP 第八章，大部分代码都能在书上找到

> 当然，你还要学会去查手册与 `Write up`

先写一个 `check.zsh` 文件来自动执行与判分：

```bash
for x in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16
    make test$x >> tsh.out

wait 
```

> 可以仔细看 `tshref.out` 的输出，一些错误处理应该输出的语句就是 `test14`

# eval

在 CS:APP 课本上实际上已经给出了蓝本，我们将此框架照写下来：

```c
void eval(char *cmdline) {
  char *argv[MAXARGS];
  char buf[MAXLINE];
  int bg;
  pid_t pid;
  sigset_t mask_all, mask_one, prev_one;

  sigfillset(&mask_all);
  sigemptyset(&mask_one);
  sigaddset(&mask_one, SIGCHLD);

  strcpy(buf, cmdline);
  bg = parseline(buf, argv);

  if (argv[0] == NULL)
    return;

  if (!builtin_cmd(argv)) {
    sigprocmask(SIG_BLOCK, &mask_one, &prev_one);
    if ((pid = fork()) == 0) {
      sigprocmask(SIG_SETMASK, &prev_one, NULL);
      setpgid(0, 0);
      if (execve(argv[0], argv, environ) < 0) {
        printf("%s: Command not found\n", argv[0]);
      }
      exit(0);
    }
    sigprocmask(SIG_BLOCK, &mask_all, NULL);
    addjob(jobs, pid, bg ? BG : FG, cmdline);
    sigprocmask(SIG_SETMASK, &mask_one, NULL);
    if (!bg) {
      waitfg(pid);
    } else
      printf("[%d] (%d) %s", pid2jid(pid), pid, cmdline);
    sigprocmask(SIG_SETMASK, &prev_one, NULL);
  }

  return;
}
```

注意这里的信号阻塞与恢复次序，在书上也已经写过了。

# builtin_cmd

```c
int builtin_cmd(char **argv) {
  if (!strcmp(argv[0], "quit")) {
    exit(0);
  } else if (!strcmp(argv[0], "jobs")) {
    listjobs(jobs);
    return 1;
  } else if (!strcmp(argv[0], "bg") || !strcmp(argv[0], "fg")) {
    do_bgfg(argv);
    return 1;
  } else if (!strcmp(argv[0], "&")) {
    return 1;
  }
  return 0; /* not a builtin command */
}
```

没有什么值得注意的地方

# do_fgbg

```c
void do_bgfg(char **argv) {
  if (argv[1] == NULL) {
    printf("%s command requires PID or %%jobid argument\n", argv[0]);
    return;
  }
  struct job_t *job;
  int id;

  if (sscanf(argv[1], "%%%d", &id) > 0) {
    job = getjobjid(jobs, id);
    if (job == NULL) {
      printf("%%%d: No such job\n", id);
      return;
    }
  } else if (sscanf(argv[1], "%d", &id) > 0) {
    job = getjobpid(jobs, id);
    if (job == NULL) {
      printf("%d: No such process\n", id);
      return;
    }
  } else {
    printf("%s: argument must be a PID or %%jobid\n", argv[0]);
    return;
  }

  if (!strcmp(argv[0], "bg")) {
    kill(-(job->pid), SIGCONT);
    job->state = BG;
    printf("[%d] (%d) %s", job->jid, job->pid, job->cmdline);
  } else {
    kill(-(job->pid), SIGCONT);
    job->state = FG;
    waitfg(job->pid);
  }

  return;
}
```

这里，注意我们不需要加锁（或者说阻塞信号）来同步，需要关注的就是：
1. 错误处理
2. 我们使用 `kill` 函数来发送信号 `SIGCONT`，在这里，如果 `kill` 的第一个参数是负数，那么表示发给整个进程组，关于这点，可以输入 `man 3 kill` 来查看

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231003191914.png)

# waitfg

这里有两种写法

1. 我们可以通过 `sigsuspend` 来发送信号进行等待（书上有这种方式）
2. 也可以通过 `sleep` 的方式来显示的阻塞

```c
void waitfg(pid_t pid) {
  sigset_t mask;
  sigemptyset(&mask);
  while (fgpid(jobs) != 0)
    sigsuspend(&mask);
  return;
}
```

```c
void waitfg(pid_t pid) {
  struct job_t *job = getjobpid(jobs, pid);
  while (job->state == FG) {
	  sleep(1);
  }
  return;
}
```

# handler

错误处理函数，我们先写两个简单的：

```c
void sigint_handler(int sig) {
  int olderrno = errno;
  pid_t pid = fgpid(jobs);
  if (pid)
    kill(-(pid), SIGINT);
  errno = olderrno;
}

void sigtstp_handler(int sig) {
  int olderrno = errno;
  pid_t pid = fgpid(jobs);
  if (pid)
    kill(-(pid), SIGTSTP);
  errno = olderrno;
}
```

注意，我们需要保存 `errno` 的旧值，最后再进行恢复（`Write up` 中有写，如果你不知道，请仔细阅读）

> 不要对 `errno` 有任何处理，例如判断其等不等于某个信号，不等于就 `error`，这可能会导致你的程序出错


对于最后的 `sigchld_handler` 函数，其蓝本在课本上也有写，但我们需要注意，不能使用 `while ((pid = waitpid(-1, &status, 0)) > 0)` 的条件来进行回收僵死子进程了，我们需要立即返回而不是等待子进程结束才返回。

并且，我们还需要修改全局数据 `jobs`，因此需要加锁进行保护。

于是，代码为：

```c
void sigchld_handler(int sig) {
  int olderrno = errno;
  sigset_t mask_all, prev_all;
  pid_t pid;
  sigfillset(&mask_all);
  int status;
  while ((pid = waitpid(-1, &status, WNOHANG | WUNTRACED)) > 0) {
    sigprocmask(SIG_BLOCK, &mask_all, &prev_all);

    if (WIFEXITED(status))
      deletejob(jobs, pid);
    else if (WIFSIGNALED(status)) {
      struct job_t *job = getjobpid(jobs, pid);
      printf("Job [%d] (%d) terminated by signal %d\n", pid2jid(pid), pid,
             WTERMSIG(status));
      deletejob(job, pid);
    } else {
      struct job_t *job = getjobpid(jobs, pid);
      printf("Job [%d] (%d) stopped by signal %d\n", pid2jid(pid), pid,
             WSTOPSIG(status));
      job->state = ST;
    }

    sigprocmask(SIG_SETMASK, &prev_all, NULL);
  }
  errno = olderrno;
}
```

> 如果你对 `waitpid` 有任何疑问，请打开终端，输入 `man 2 waitpid`，自行 `RTFM`
> 
> ![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231003192950.png)


# Result

运行：

```bash
zsh check.zsh
```

进行检查即可，注意 `ps` 的进程可能会不一样，进程的 `pid` 也可能不一样，但形式与顺序应当是一致的。

> 如果你看不明白 `diff` 工具的输出的话，可以自行写一个 `.py` 脚本来检测