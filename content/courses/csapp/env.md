---
title: 实验环境搭建
description: 一些搭建环境的远古方法
tags: [CMU]
date: 2022-03-29 
lastmod: 2024-12-10
draft: false
---


> 先决条件：
>
> 1. 电脑是Windows系统
> 2. 确认开启了WSL2

# 前置

在官网下载 `docker decktop` [Developers - Docker](https://www.docker.com/get-started/)

然后根据安装步骤一步一步来，确定安装成功（过程中遇到什么问题可以百度解决）



# 实验环境

`win + r` 输入 `cmd`，输入命令

```shell
docker pull ubuntu:18.04
```

默认会拉取的 `Ubuntu` 的 `image`。



拉取完成后，在本地实验的地方建一个文件夹，如 `D:\Documents\code\csapp`，然后输入命令

```shell
docker container run -it -v D:\Documents\code\csapp:/csapp --name=csapp_env ubuntu:18.04 /bin/bash
```

命令中的  `csapp_env` 可以改成想要的名字。

运行完之后，现在 `cmd` 就变成了一个 `Linux` 下的一个 `shell`，可以运行 `Linux` 的一些命令了，比如可以 `ls` 一下

```shell
ls -al
```

会发现列出来的文件里面有我们的 `csapp` 文件夹。



但到此为止，我们只解决了操作系统的问题，还有一些环境没配置...

于是运行如下命令：



·更新 `apt` 软件源

```shell
apt-get update
```

安装 `sudo`

```shell
apt-get install sudo
```

安装一系列编译环境：

```shell
sudo apt-get install build-essential
sudo apt-get install gcc-multilib
sudo apt-get install gdb
```

最后安装一下 `vim` （可以不用但不能没有！）

```shell
sudo apt-get install vim
```

至此，实验环境已经安装完了。

# 运行环境

在 `cmd` 下运行命令：

```shell
docker start csapp_env
docker exec -it csapp_env /bin/bash
```

就可以开始进行实验了（先 `cd` 到实验的文件夹里面去）

可以使用 `docker kill csapp_env` 来关闭环境。



（干脆把 `cd` 那一块一起写了）

```shell
cd csapp/xxxxlab
# 开始 ./ 或者 gcc 或者 gbd 或者 objdump
```



