---
title: Linux-0.11 RTFSC 环境配置
description: 
tags:
  - Linux
  - OS
  - dodola
date: 2023-11-17
lastmod: 2024-12-10
draft: false
---

# 环境搭建

建议在 `docker` 环境下搭建，构建的 `Dockerfile` 如下：

```dockerfile
from ubuntu:20.04

run sed -i 's@//.*archive.ubuntu.com@//mirrors.ustc.edu.cn@g' /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    wget \
    unzip \
    git \
    libssl-dev \
    pkg-config \
    qemu \
    qemu-system \
    gcc \
    gdb

workdir /root/

run wget https://github.com/yuan-xy/Linux-0.11/archive/refs/heads/master.zip && \
    mv master.zip linux-0.11.zip && \
    unzip linux-0.11.zip
```

这里考虑到从 [原版](kernel.org) 开始构建会比较麻烦，毕竟 `Linux 0.11` 是很早期的版本了，所以直接用了别人修改过的项目（当然关于源码的部分是肯定没改的）

输入命令：

```bash
docker build --network=host -t linux0.11 -f <your-dockerfile-name> .
```

进行镜像的构建，然后使用命令：

```bash
docker run --network=host -it linux0.11:latest /bin/bash
```

运行项目即可。

我在这里使用 `VS Code` 直接连接进入容器中，如下所示：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311172214293.png)

然后在此终端中输入 `make && make start` 即可运行。

# 如何查看qemu的窗口

由于我们在 `docker` 中没有开启 `GUI`，所以这里 `qemu` 的窗口我们是无法直接看见的，但可以发现，`make satrt` 会开启一个 `vnc server`，在端口 `5900`，我们只需要在本机安装一个 `vnc client` 即可查看此远程桌面。

这里，我们可以选择 `realvnc`，在 `ArchLinux` 下安装：

```bash
yay -S realvnc-vnc-viewer
```

然后，启动此 `vnc viewer`，在 `url` 里输入 `localhost:5900` ，打开即可看见 `qemu` 的窗口：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311172219331.png)

# Debug

在 `Debug` 之前，我们需要修复一个 `bug`，修改 `Makefile` 文件中的 `debug` 部分如图：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311172221726.png)

即，将 `qemu-system-x86_64` 修改为 `qemu-system-i386`

我们可以在终端输入 `make debug` 来启动一个 `gdb server`，然后，启动另一个终端，输入：

```bash
gdb tools/system
```

进入 `gdb`，然后输入：

```
target remote:1234 
```

即可连接到 `gdb server`，然后输入：

```bash
b main
c
```

即可得到下图：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311172223327.png)

而对于 `qemu` 的窗口，应该如下所示：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311172223740.png)

至此，环境已搭建完成。