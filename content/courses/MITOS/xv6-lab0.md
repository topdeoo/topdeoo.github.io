---
title: Lab0 Tools
description: 实验所需要安装的环境😶
tags:
  - OS
  - MIT
date: 2022-04-01
lastmod: 2024-12-11
draft: false
---

# 实验准备

**只针对 Windows 系统**

1. 首先，需要安装 [WSL2（Windows Subsystem for Linux 2）](https://docs.microsoft.com/zh-cn/windows/wsl/install)，使用 Ubuntu，具体的教程可见微软官网

1. 打开 Ubuntu 命令行，运行如下两条命令：

```bash
sudo apt-get update && sudo apt-get upgrade
sudo apt-get install git build-essential gdb-multiarch qemu-system-misc gcc-riscv64-linux-gnu binutils-riscv64-linux-gnu
```

（运行命令前，建议将更新的源更换为国内镜像服务器，如阿里云等，否则可能会直接下载失败）

文件可在 `//wsl$` 下找到

1. 运行命令

```bash
git clone git://g.csail.mit.edu/xv6-labs-2021
```

将实验所需要的文件克隆到本地

1. 在 `xv6-labs-2021` 目录下，使用命令`make qemu` 来启动`xv6` 系统， 若想来退出系统的`shell`，先`Ctrl` + `A`，随后按`X`即可 ，此系统实验所需要的文件在`user` 与 `kernel` 文件夹中。

1. 建议下载编辑器来进行实验，Ubuntu 自带的 VIM 命令行下确实不太好用……，可以使用`VS Code` 来进行实验。

**更新**：如何使用 `gdb` 调试

首先你需要有两个终端, 针对这点, 我们使用 `tmux`, 这里简单介绍一下用法:

- 输入 `tmux` 以进入
- 输入 `Ctrl` + `B` 后输入 `%` 可竖直拆分窗口
- 输入 `Ctrl` + `B` 后输入 `"` 可水平拆分
- 输入 `Ctrl` + `B` 后输入 `o` 可在拆分的窗口中切换

然后, 我们在一个窗口内输入 `make qemu-gdb CPUS=1`, 可以发现输出了很多信息,其中有一条是 `tcp :25000`

最后, 我们在另外一个窗口中输入 `gdb-multiarch` , 然后输入 `set architecture riscv:rv64` `target remote :25000`即可连接上`qemu`进行调试

> 当然我们也可以在 ~/.gdbinit 中加上 `add-auto-load-safe-path ~/xv6-labs-2021/.gdbinit`
>
> 随后，只需要输入 `gdb-multiarch` 就可以进入调试

注意，这里的 `gdb` 不能输入 `r` ，应该输入 `c` 以开始运行。
