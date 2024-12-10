---
title: 环境配置
description: CS144 的一些准备工作
tags:
  - Stanford
  - Network
date: 2023-02-20
lastmod: 2024-12-10
draft: false
---

# 选修原因

开始学习 `CS144` 这门课程并不是因为想学计网（当然可能也是有点想的，因为发现自己在这方面还是很欠缺），而是因为这门课程的实验是使用 `C++` 来构建出一个 `TCP` 协议栈。回顾前两年的学习，我发现我没有一门语言称得上擅长，`C` 无法做到 `xv6` 中那样熟练，`Java` 也并不清楚其各种机制特性，`Python` 也只是明白基础语法而无法做到 `Pythonic`，甚至连最常使用的 `C++` 也只是 `C with STL` 甚至 `STL` 也并不是那么熟练。因此选择了这门课程来锻炼自己的 `C++` 能力。

# 环境准备

## 方案一

按照课程官网说明，我们可以使用官方准备好的 VM 直接进行操作，具体可参见课程网站[Setting up your CS144 VM (stanford.edu)](https://stanford.edu/class/cs144/vm_howto/)

> 我没有采用这个方案，因为我电脑上的 `VM` 太过拉跨……日常死机，可能是电脑配置太差劲了

## 方案二

如果你有一台 `Linux` 系统的电脑，直接用（可惜我没有）

## 方案三

使用 `docker` 进行实验，你可以从头开始配置环境，也可以使用好心人配置好上传的 `docker`。用 `docker` 而不是 `WSL` 的原因是我有点害怕实现协议栈时会导致电脑网络出问题，而使用 `docker` 并不会出现这种问题，直接重新构建 `container` 就行。

此方案的使用方法为：

安装 `docker` 后，打开 `cmd` ，输入命令：

```shell
docker pull vidocqh/cs144:latest
```

随后创建容器：

```shell
docker container run -v -it vidocqh/cs144:lastest /bin/bash
```

这样就可以开始 `Lab0` 了

# F&Q

不用 `WSL` 还有一个很重要的原因是因为实验必须依赖真实的 `Linux` 环境，否则会出现一系列莫名其妙过不去的点，但这些过不去的点又和你编写的代码没有一点关系，为了身心健康考虑还是不要使用 `WSL` 了。（`WSL2` 可能可以，但是 `WSL2` 的文件系统和本机不互通，也是一个很大的问题，不如使用 `docker`）



