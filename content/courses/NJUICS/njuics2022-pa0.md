---
title: NJU ICS PA-0
description: ICS PA 的实验环境准备
tags:
  - NJU
  - ICS
date: 2023-07-16
lastmod: 2024-12-11
draft: false
---

# 实验环境

按照 [文档](https://nju-projectn.github.io/ics-pa-gitbook/ics2022/pa0/) 中的提示即可完成。

由于本人的系统为 `Manjaro`，因此并不需要安装双系统，这里直接开始搭建软件环境。

> [!note]
>
> 更新，如果你不想安装双系统，这里有一种更合适的方式，使用 [[docker-example|docker]]

## Docker 版本的环境

我们从裸的 `ubuntu 22.04` 开始，在 `cmd` 中运行如下 `Dockerfile`：

```docker
FROM ubuntu:latest

RUN sed -i 's/archive.ubuntu.com/mirrors.ustc.edu.cn/g' /etc/apt/sources.list
RUN apt-get -y update && apt -y  upgrade
ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai
RUN apt-get install -y \
    man \
    vim \
    git \
    wget \
    libgoogle-glog-dev \
    gcc \
    libtinfo-dev \
    zlib1g-dev \
    build-essential \
    libedit-dev \
    libxml2-dev \
    libssl-dev \
    unzip \
    pip \
    libsndfile1 \
    gcc-doc \
    gdb \
    libreadline-dev \
    libsdl2-dev \
    llvm llvm-dev \
    tmux \
    clangd clang-format clang-tidy
RUN apt-get update && \
	apt-get install -y locales && \
	locale-gen zh_CN && \
	locale-gen zh_CN.utf8 && \
	apt-get install -y ttf-wqy-microhei ttf-wqy-zenhei xfonts-wqy
WORKDIR /root
ENV LANG zh_CN.UTF-8
ENV LANGUAGE zh_CN.UTF-8
ENV LC_ALL zh_CN.UTF-8
```

由于后期可能需要一些图形化界面，这里我们采取的策略是使用 `X11` 来进行转发，请安装 Windows 上的 `X11` 客户端：[VCXSRV](https://github.com/ArcticaProject/vcxsrv)

随后，我们在一个目录下（你的代码目录）打开 `cmd`，输入：

```powershell
git clone -b 2022 git@github.com:NJU-ProjectN/ics-pa.git ICS
```

接着，通过以下命令来构建这个容器：

```powershell
docker build . -f Dockerfile -t njupa
docker run -ti --rm -e DISPLAY=host.docker.internal:0.0 -v ICS:/root/ICS njupa
```

接着我们就可以在 windows 下编写代码，然后通过 `docker run` 这条命令进入 `ubuntu` 进行执行

# 模拟器构建

对于 `git` 的配置，由于已经配置完成，如果无法配置的话请 `STFW`，在命令行输入：

```bash
git clone -b 2022 git@github.com:NJU-ProjectN/ics-pa.git ics2022
```

随后

```bash
cd ics2022
```

由于本人使用的 `shell` 为 `zsh`，因此需要更改 `init.sh` 的 `addenv()` 如下：

```bash
function addenv() {
  sed -i -e "/^export $1=.*/d" ~/.zshrc
  echo "export $1=`readlink -e $2`" >> ~/.zshrc
  echo "By default this script will add environment variables into ~/.zshrc."
  echo "After that, please run 'source ~/.zshrc' to let these variables take effect."
  echo "If you use shell other than bash, please add these environment variables manually."
}
```

随后运行：

```shell
git branch -m master
bash init.sh nemu
bash init.sh abstract-machine
source ~/.bashrc
```

然后检查环境变量是否正确：

```shell
echo $NEMU_HOME
echo $AM_HOME
cd $NEMU_HOME
cd $AM_HOME
```

如果 `cd` 命令未报错，则说明配置是正确的

创建新分支：

```shell
git checkout -b pa0
```

> 修改 `Makefile` 中的
>
> 1. STUID
> 2. STUDENT
>
> 然后进行一次 `git` 提交

运行如下命令

```shell
cd nemu
make menuconfig
```

随后，会出现一个弹窗，请不要修改任何配置，选择 `Exit` 后，选择 `Yes` 退出，系统会自动生成一个 `.config` 的文件，随后运行

```shell
make
```

至于其他的配置与用法，在文档中写的都很详细，请时刻记住 `RTFM`
