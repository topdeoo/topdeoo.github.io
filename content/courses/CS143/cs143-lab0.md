---
title: 环境配置
description: Stanford CS143 实验环境安装与配置
tags:
  - Stanford
  - 编译器
  - 环境配置
date: 2022-07-16
lastmod: 2024-12-15
draft: false
---

> [!important]
>
> 针对 Windows 系统

# 下载并安装 docker

步骤可见 [Get Docker | Docker Documentation](https://docs.docker.com/get-docker/)

# 环境安装

这部分与 `CSAPP` 不同，我们不需要从头开始配置环境，可以使用网上古圣先贤配好的环境，地址为[syhkiller/stanford-cs143 - Docker Image | Docker Hub](https://hub.docker.com/r/syhkiller/stanford-cs143/#!)

1. `win + r` 输入 `cmd` 打开命令行，输入命令：

   ```bash
   docker pull syhkiller/stanford-cs143
   ```

2. 等待下载完成后，运行容器：

   ```bash
   docker container run -it -v --name=cs143 syhkiller/stanford-cs143 /bin/bash
   ```

3. 这样，我们就创建了一个名为 `cs143` 的容器。

# 环境检验

由于这个实验不需要我们自己创建文件夹完成，所以这里使用另一种方法。

在 `VS Code` 中安装两个插件 `Docker` 与 `Remote Container`，下面演示一下如何使用 `VS Code` 来浏览 `Docker` 中的文件。

![Step-1](https://s2.loli.net/2022/07/16/xcFzluGIyW5EhDY.png)

随后，会弹出一个全新页面，我们选择打开文件夹：

![Step-2](https://s2.loli.net/2022/07/16/16BtNyJF7kUL5ne.png)

打开 `PA1` 文件夹后，我们在 `stack.cl` 中编写如下代码：

```cpp
class Main inherits IO{
    main(): SELF_TYPE{
        out_string("Hello World!\n")
    };
};

```

并对 `Makefile` 中的 `test` 部分进行修改：

```makefile
test:	compile
	@echo stack.test
	${CLASSDIR}/bin/spim -file stack.s < stack.test
```

随后，我们在终端中输入 `make test`，得到如下结果：

![Hello World](https://s2.loli.net/2022/07/16/gNYDy2HOiUf4JEu.png)

那么说明实验环境已经成功配置。

> 在 `VS Code` 中，我们还可以下载一个 `language-cool` 的拓展，来让 `.cl` 文件有高亮显示
>
> 还有一个 `yash` 的插件（在 `lab1` 中有作用）
