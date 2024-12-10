---
title: 外包项目问题记录与解决
description: 
tags:
  - Issue
  - Linux
date: 2024-11-13
lastmod: 2024-12-10
draft: false
---
# 安装系统问题

服务器是 `VMware vSphere` 的一个虚拟机，开始本质上是一个 `bare metal`，我们需要通过 `VMware` 提供的工具（需要注册才能够下载）[Remote Console](https://knowledge.broadcom.com/external/article/368995/) 的文档进行下载（没有文档甚至根本不知道下载地址在哪里，太夸张了）

下载了这个之后，需要下载一个服务器 `iso` 文件，这里以 `ubuntu-20.04.6-live-server-amd64.iso` 为例。

在页面中挂载 `CD/DVD` 文件后，最重要的一步是：

**在进入安装页面的时候会卡很久，一般可能是因为需要网络将 iso 文件传输过去，所以会导致很慢，尤其 20.04 会扫描一遍硬盘，基本上没有两个小时无法进入正常的安装页面**
# docker-compose 构建后导致无法 ssh
## 问题记录

访问的服务器网段为 `175.159.xxx.xxx`（eduhk 的一个虚拟机），当我使用命令：

```bash
docker-compose up -d --build
```

后，提示创建了一个名为 `xxxx` 的 `bridge` 设备，接着 `ssh` 卡死，退出后重连，显示 `Connection Timeout` 

## 问题排查与解决

直接重启了虚拟机，发现依然无法 `ssh` 上，但此时的报错信息为 `Connection Refused`，大概率是因为 `sshd` 服务未开启

输入命令 `sudo systemctl status sshd` ，发现是 `inactive` ，随即输入 `sudo systemctl start sshd` 开启 `sshd`

尝试 `ssh` 发现依然是 `Connection Timeout`，但使用 `sudo apt update` 发现外网是连通状态，再结合先前 `docker` 提示的信息，尝试如下命令：

```bash
docker network ls
```

发现除了 `docker` 默认创建的 `bridge` 网桥设备外，还多了一个桥接设备，不用说大概率是因为网段冲突了

> 有意思的一点是在我遇到这个问题前，sysu 的群友也遇到了类似的问题，所以才能感觉应该是网段冲突的问题，而且 hk 和 sysu 挺近的，感觉可能内网地址的设置也很相似（

### 解决方案

更改 `docker` 默认的网段地址为 A 类地址：

```bash
sudo vim /etc/docker/daemon.json
```

写入如下：

```json
{  
  "default-address-pools": [{"base":"10.10.0.0/16","size":24}]  
}
```

然后，删除 `docker` 建立的所有网络并重启 `docker`

```bash
sudo docker network prune
sudo systemctl restart docker
```

到这一步之后，以及可以 `ssh` 到服务器了