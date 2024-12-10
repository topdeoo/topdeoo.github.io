---
title: 环境搭建
description: Project Setup & Simple Test
tags:
  - OS
  - PKU
date: 2023-08-10
lastmod: 2024-12-10
draft: false
---

# Setup

由于 `UCB` 的方法不对外校开放，开放的方法不是很能用= =，所以看了 `PKU` 的文档 [Environment Setup](https://alfredthiel.gitbook.io/pintosbook/getting-started/environment-setup) ，进行构建。

> 由于本人不喜欢 `Virtual Box` ，所以这里还是选择了使用 `Docker` 构建（主要是不想下载，已经用了 `Linux` 居然还要用内存去开虚拟机……

运行命令：

```bash
docker run -it pkuflyingpig/pintos bash
```

等待下载完成并运行，输入 `ls` ，看见 `toolchain` 文件夹说明下载成功

接着，克隆 `PKU` 的 `Pintos` 仓库（代码已经和 `CS 162` 不一样了，在文档中说这部分是 `PKU` 修改过的，看了一下 `UCB` 的实验似乎还有个人实验，这个 `pintos` 是一个小组实验）

运行：

```bash
git clone git@github.com:PKU-OS/pintos.git
docker run -it --rm --name pintos --mount type=bind,source=$pwd,target=/home/PKUOS/pintos pkuflyingpig/pintos bash
```
由于下面这个命令可能会频繁使用，所以在 `.zshrc` 里写个 `alias`：

```bash
alias pintos-up="docker run -it --rm --name pintos --mount type=bind,source=$pwd,target=/home/PKUOS/pintos pkuflyingpig/pintos"
```
进入容器后，输入以下命令：

```bash
cd pintos/src/threads
make 
cd build
pintos --
```

如果出现结果如下，则表示启动成功，环境已经安装好了

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230810233232.png)

可以按 ` < Ctrl A > ` + ` X `，表示先按下 ` Ctrl ` + ` A `，再按下 ` X ` 来退出 `QEMU`

# Improve

可以发现 `pintos` 这个文件夹是没必要的（在可以通过 `VS Code` 直接 `ssh` 到容器的情况下），所以可以直接把源代码内置到容器之中，因此，我重新制作了一个镜像，并上传到了 `docker hub` 上

使用：

```bash
docker run -it virgil7/pintos bash
```
下载后，通过 `VS Code` 中的 `ssh remote` 连接到容器中（如果不会用这个功能，请 STFW），如下所示：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230811145121.png)


> 如果显示了 `container is not started` 类似错误，运行 `docker start <container-id>` 启动容器即可

这样，就不需要使用 `pintos-up` 这个命令来启动容器测试了，可以直接在容器内写代码测试

# L0 Getting Real

## Task 1: Booting Pintos

启动操作系统，按理来说是很简单的，如果搭建的教程是文档中的话，这一步不会出问题

但如果用的是我上传的 `docker`，也就是用 `vs code` 连接的话，在运行 `pintos --` 这一步时会出现：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230811155843.png)

解决这个问题的方法也很简单，用电脑的终端就可以，例如：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230811155927.png)

出现这个问题的原因大概有点头绪，应该是 `Makefile` 和 `perl` 脚本中对 `vga` 的定义写法的问题，留个坑之后再来解决这个问题。

上图为通过 `QEMU` 启动，此操作系统还可以通过 `Bochs` 启动，如图：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230811160231.png)

## Task 2: Debugging

运行命令：

```bash
pintos --gdb -- 
```

然后打开另外一个终端，输入：

```bash
pintos-gdb kernel.o
```

为了方便之后调试（主要是因为没有自动补全），所以写几个 `alias`：

```bash
echo 'alias pgdb="pintos-gdb" \n alias osstart="pintos --" \n alias osgdb="pintos --gdb --" ' >> ~/.bashrc
```



