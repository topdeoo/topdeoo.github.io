---
category:
- 关于实验文档的零零碎碎
date: "2023-09-21 23:06:00"
math: true
tag:
- Lab Documents
- ChCore
title: ChCore 实验 0：环境搭建
---
# 实验 0：环境搭建

在开始做 ChCore 实验之前，需要准备好一个适当的开发、构建和运行环境，并了解如何获取、更新和提交 ChCore 实验代码。

## 准备开发、构建和运行环境


在开始 ChCore 实验之前，需要准备一个适合自己的开发、构建和运行环境，根据同学自身（和自己的电脑）情况不同，下面提供几种方案以供选择。

### 方案一：自己配置环境并使用 Docker

我个人为这个实验准备了一个 `docker` 环境，可以直接在 `docker hub` 上拉取，这样只需要打开容器后，使用 `vs code` 的 `remote ssh` 连接，就可以获得良好的实验体验。

方法如下：

### 方案二：自己配置所有环境

> 提示：使用 Apple Silicon 或其他 ARM CPU 的同学，采用这种方法可能获得更快的构建速度。

这种方法默认你使用了 `unix-like` 的系统，默认你拥有使用命令行的经验和基础。

请自行参考 ChCore 根目录的 `scripts/build/Dockerfile` 安装所需构建工具链（部分工具在实验中用不着，可自行判断），并留意后面构建和运行时使用的命令的不同。

## 获取 ChCore 代码

> 如果你使用的是 `docker`，那么可以跳过这一步

### 拉取代码到本地

```shell
git clone https://gitee.com/ipads-lab/chcore-lab-v2.git
cd chcore-lab-v2
make build
```

> 注意，请不要把你的代码 `push` 到这个上面，如果需要上传到 `github`，请使用以下命令：

```shell
cd chcore-lab-v2 # if you do not in this directory
git remote rename origin public
git remote add origin <your-own-github-repo-ssh>
```

这样，我们可以推送到名为 `origin` 的远程分支上，并且从 `public` 这个分支上拉取。

### 如何获取不同实验的代码

下面的操作说明，如何切换到下一个实验代码分支来进行实验。假设你已经做完了第 x-1 个实验，下面要切换到第 x 个实验：
  
```shell
git fetch public
git checkout -b labx public/labx
git push -u origin   # 可以不做这一步
git merge lab(x-1)
```

`git merge` 命令有时候并不能自动地进行合并，别忘了手动处理这些冲突！

### tips

请修改根目录下的 `Makefile` 中的 `qemu` 与 `qemu-gdb` 规则如下：

```makefile
qemu: build
	$(V)$(_QEMU) $(QEMU_OPTS)

qemu-gdb: build
	$(V)$(_QEMU) -S -gdb tcp::$(QEMU_GDB_PORT) $(QEMU_OPTS)
```

## 构建和运行 ChCore

在 ChCore 实验代码的根目录（以后称 ChCore 根目录）运行下面命令可以构建和使用 QEMU 运行 ChCore：

```shell
make qemu
```

> 当没有完成 `lab1` 时，是没有任何输出的。

你可以按 `<C-A> + X` 来退出 `QEMU` (意为按下 `Ctrl + A` 后，再按下 `X` )
## 调试

请打开两个终端（如果你熟悉 `tmux` 那么可以直接使用这个）

> 请注意终端工作目录为项目的根目录

一个终端内输入 `make qemu-gdb`，等待其出现 `Succeeded to build all targets` 提示后，在另一个终端内输入 `make gdb`，即可进入 `gdb` 调试。

具体的 `gdb` 操作可以阅读 [Debugging Under Unix: gdb Tutorial](https://www.cs.cmu.edu/~gilpin/tutorial/) 与 [GDB Tutorial: Advanced Debugging Tips For C/C++ Programmers](https://www.techbeamers.com/how-to-use-gdb-top-debugging-tips/) ，也可以观看 `xv6` 助教的教学视频（视频在 `bilibili` 有，请自行 `STFW`）

## 编写代码

推荐使用 `VS Code` 进行编写，并使用 `clangd` 进行配置

> 注意，如果你不对 `clangd` 进行一定程度的配置，那么你的跳转体验会很差，虽然你可以使用 `vim` 中的 `gd` 来跳转，也可以使用全局搜索来解决。

但注意，不要使用 `cmake tools` 拓展，也可以不使用 `cmake` 拓展，这样会导致一些构建上的问题。
  
## 获取参考评分

在 ChCore 根目录运行下面命令可检查当前得分：

```shell
make grade
...

===============

Score: 100/100
```

注意，此得分仅供参考，部分实验步骤无法通过评分脚本获得正确性检查，但可能会影响后续实验的进行。