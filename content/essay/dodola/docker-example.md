---
title: docker 配置各类实验环境
description: 
tags:
  - dodola
date: 2024-06-03
lastmod: 2024-12-10
draft: false
---

# Docker 的一些好处

使用 `docker` 的好处有很多，最大的特点就是你可以拿到一个速度并不算很慢，而且能够随便乱玩的 `Linux` 系统，而不是在自己的生产环境上乱玩。

这里以 `tinyriscv` 这个项目为例，解释一下如何通过 `docker` 来搭建一个自己的实验环境，并保存与迁移。

如果你还没有安装 `docker`，请在 [这里](https://www.docker.com/products/docker-desktop/) 这里安装 `docker`

# 初级版

> 这个版本不需要自己手写 `Dockerfile`，直接从一个裸的机器开始搭建。

首先，我们通过如下命令下载一个镜像，然后新建一个容器，其名称为实验项目，例如这里的名称为 `tinyriscv`

```bash
docker run -it --name tinyriscv --network=host -e http_proxy=http://127.0.0.1:7890 -e https_proxy=http://127.0.0.1:7890 ubuntu /bin/bash
```

这里，我们没有指定 `ubuntu` 的版本，它默认会拉取最新的镜像版本，如果你的实验项目对版本有要求，那么只需要在冒号后指定版本即可，例如：

```bash
docker run -it --name tinyriscv --network=host -e http_proxy=http://127.0.0.1:7890 -e https_proxy=http://127.0.0.1:7890 ubuntu:20.04 /bin/bash
```

> 注意，这里的代理端口与 `ip` 地址，在 `windows` 下，我们需要指定为 `wsl2` 的 `ip` 地址及其代理端口，如果想知道如何为 `wsl2` 设置代理，请阅读[这篇文章](https://w6cpew3bz0.feishu.cn/wiki/MiQOwGiWCiaaAhkoBEUcaFe8nyb?from=from_copylink)

第一次拉取镜像会去 `dockerhub` 下载，如下图所示：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202406032009763.png)

> 如果下载速度较慢的话可以选择挂梯子走系统代理，或者通过镜像加速，方法见[此处](https://blog.csdn.net/Lyon_Nee/article/details/124169099) 

完成后，会进入一个 `bash` 的交互页面，如下图所示：
![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202406032032732.png)

随后，我们的工作就是开始下载包，由于我们的指令中指定的网络连接状态为 `host`，因此我们不需要为这个容器配置代理。

在项目文档中，有详细的安装指南：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202406032036985.png)

我们的做法就是直接照抄命令，但由于这是一台裸机，我们需要做一些初始化：

```bash
apt update
apt install git vim build-essential
cd
```

> 使用 `docker` 不好的一点是对于 `github` 我们无法使用 `ssh` 进行登录，这就意味着我们不能 `push` 代码上去，但依然可以在本地做版本管理，最后一口气提交到仓库中去

对于上面一点的解决方案是，我们可以把代码克隆到本地，然后通过挂载虚拟卷的方式，挂载到容器中，例如如下命令：

```bash
docker run -it --name tinyriscv --network=host -v tinyriscv:/root/tinyrisv ubuntu:latest /bin/bash
```

> 关于工具链的下载，可以采用官网的方式 `https://github.com/riscv-collab/riscv-gnu-toolchain` 
> 如果一定要使用百度云下载，那么可以下载到本地后，使用 `docker cp` 命令复制到容器中，命令为：

```bash
docker cp [source] [container]:[path]
```

例如，把本地的 `example` 文件夹复制到容器ID为 `65` 开头的那个容器中，其命令为：

`docker cp example 65:/root/example`

这样，就能够愉快的使用 `docker` 来运行实验了。

# 进阶版

初级版需要写命令，很烦人，并且我们的镜像是个裸机，没有什么软件包（几乎是什么都没有），因此我们希望我们能够写一个文件，让它自动帮我们构建出一个符合要求的镜像，这样我们只需要从这个镜像生成容器即可（甚至可以加 `--rm` 命令让他跑完我们的运行命令就自动删除，直接完成一条命令生成一个容器）

通常，这种文件被称为 `Dockerfile`，其命名一般也是 `Dockerfile`，但对特定我们需要区分名字的镜像，例如 `tir` 和 `tvm`，我们可以写两个配置文件，命名为 `Dockerfile.tir` 和 `Dockerfile.tvm`。

写完后，我们只需要一行命令即可开始构建：

```bash
docker build . -f Dockerfile.tir  -t tir
```

其中 `-f` 表示从哪个文件进行构建，`-t` 表示构建生成的镜像的标签名称

## tiny RISC-V

我们来写一个简单的 `Dockerfile` 来构建 `tinyriscv`，如下所示：

```dockerfile
FROM ubuntu:latest
# Install tools and dependencies.
RUN sed -i 's/archive.ubuntu.com/mirrors.ustc.edu.cn/g' /etc/apt/sources.list
RUN apt-get -y update && apt -y upgrade
ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai
RUN apt-get install -y \
    vim git build-essential \
    autoconf gperf flex bison gtkwave \
    automake autotools-dev curl python3 python3-pip \
    libmpc-dev libmpfr-dev libgmp-dev gawk \
    texinfo gperf libtool patchutils bc \
    zlib1g-dev libexpat-dev ninja-build cmake libglib2.0-dev libslirp-dev

# Set the working directory.
WORKDIR /root

RUN git clone https://github.com/steveicarus/iverilog.git && \
	cd iverilog && \
	git checkout v11-branch && \
	sh autoconf.sh && \
	./configure && \
	make -j8 && \
	make install && \
	cd /root/

RUN git clone --depth=1 https://github.com/riscv/riscv-gnu-toolchain && \
	cd ricsv-gnu-toolchain && \
	./configure --prefix=/opt/riscv && \
	make linux -j8

```

随后，我们直接运行构建文件：

```bash
docker build . -f Dockerfile -t tinyriscv
```

然后，通过此镜像构建容器：

```bash
docker run -it --name=tinyriscv --network=host -e http_proxy=127.0.0.1:7890 tinyriscv
```

# 如何在容器中写代码

这里介绍一种最简单的方式：`VS Code` 

我们在 `VS Code` 中安装插件：

![docker](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202406032230107.png)

![remote-ssh](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202406032235197.png)

随后，在左侧侧边栏找到 `Docker` 图标，并打开：

![sidebar](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202406032237603.png)

然后选择第一个容器，右键，选择 “附加 Visual Studio Code“，然后就可以在容器中使用 `VS Code` 了

> 你可以在容器中下载任意你需要的插件（只需要下载必要的语言插件与补全插件即可）