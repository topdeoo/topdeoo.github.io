---
title: How to build f**king envrionment
math: true
date: 2023-12-25 09:59:50
---

# 写在前面

:::tip

由于本人使用的服务器系统都是 `Ubuntu` 系列，所以后面的安装等都依据 `Ubuntu` 上的来。

:::
# Docker

就像之前所说，由于没有 `sudo` 权限，因此需要使用 `Docker`

首先下载 `docker`:

```bash
sudo apt update && sudo apt install -y docker docker-compose
```

随后，将用户加入 `docker` (否则每次都会需要 `sudo` )

```bash
sudo groupadd docker
sudo usermod -aG docker ${USER}
sudo systemctl restart docker
su ${USER}
```

注意，这里每一步都需要密码（如果你不知道密码或者没有 `sudo` 权限，请让有权限的人把你加进去）

:::tip

请注意，后面软件的安装，如果不是特别说明，默认是安装在服务器的 `docker` 中

:::
# Python

:::danger

tl;dr 不要使用 `apt` 来下载各种版本的 `python`

:::

关于 `python`，我的建议是不要使用 `apt` 的源来下载，因为真的真的很不好管理 `python` 的版本，比如如果没有 `ppa` 源的话，那目前似乎在 `ubuntu22.04` 上下载的是 `python3.10`

建议使用 `anaconda` 或者 `miniconda`
# Anaconda

下载部分，我建议直接去 [官方文档](https://docs.anaconda.com/free/anaconda/install/linux/) 一步一步来，因为版本是在更新的，我在这里写好了，但之后要下载最新版的可能还得去查。

在内存完全够用的情况下，我建议直接下载 `Anaconda` 

在你安装完之后，请输入：

```bash
conda config --set auto_activate_base False
```

来关闭每次 `anaconda` 的自启动。

:::tip

Anaconda 老生常谈的一个缺点就是下载时如果条目在终端显示不下的话，就会卡在那里，没有进度条来观察到底是卡死了还是正在下载。

:::

## Mamba

[Mamba: Package Manager](https://github.com/mamba-org/mamba)

在知乎上的评价似乎比 Anaconda 要好一点，主要表现在下载的速度上。


# PyTorch


