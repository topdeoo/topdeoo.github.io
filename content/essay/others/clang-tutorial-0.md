---
title: clang Tutorial#0
description: clang 源码阅读
tags:
  - InNight
  - Compiler
date: 2023-05-30
lastmod: 2024-12-10
draft: false
---

对 `clang` 源码的阅读笔记

# 克隆项目

使用命令

```bash
git clone https://github.com/llvm/llvm-project.git --depth=1
```

克隆到本地

不必理会庞大的项目结构，我们通过解耦的方式一步一步来阅读此项目

# 导读

首先我们需要知道 `clang` 只是编译器的前端部分，负责：

1. 词法分析
2. 语法分析
3. 静态检查

而 `llvm` 负责后端的部分

> 这部分可能随着后续的阅读还会进行修改,先留个坑

我们从前端部分开始阅读，在 `clang` 文件夹中为其前端部分。

> 阅读前可能会有一个疑问，为什么 `llvm` 是用 `C++` 写的？
>
> 如果你有这个疑问，请 `Google` 什么是编译器自举

# 基础

## 诊断

不同的**前端阶段**具有不同种类的诊断信息，并且`clang` 根据问题的严重性对诊断进行了分类，定义在 `clang/include/clang/Basic/DiagnosticIDs.h` 中，如下图所示

![image-20230530214051848](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230530214051848.png)

## `llvm::Triple`

此文件的定义不再 `clang` 文件夹下，请在电脑上安装 `clang` ，以下以 `Manjaro` 为例：

在文件夹 `/usr/include/llvm/ADT/Triple.h`

其定义的成员变量如下所示：

![image-20230530214705418](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230530214705418.png)

## `llvm::ToolChain`

在文件夹 `/usr/include/clang/Driver/ToolChain.h`

这里定义了编译的工具链

![image-20230530214745494](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230530214745494.png)

# clang driver

> 可以通过 `clang -### xxx.c` 来查看 `driver` 到底调用了哪些命令，例如：
>
> ```bash
> clang++ -### main.cc |& vi -
> ```
>
> （由于输出重定向到了 `stderr` 中，所以这里需要加上`&` 从jyy老师的课上学到的linux知识）
>
> 在 `vim` 中，选择最后两行，输入 `gqq` 即可根据空格拆分，如下图所示：
>
> ![image-20230530221916345](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230530221916345.png)

## clang driver 流程简介 

`clang Driver` 负责拼接编译器命令和 `ld` 命令。

> 注意：`clang driver` 自身**不会**对源码进行编译

`clang Driver` 的处理逻辑分为以下几步：

**Parse: Option Parsing**：解析传入的参数

**Pipeline: Compilation Action Construction**：根据每个输入的文件和类型，组建 `action`（比如 `PreprocessJobAction`）

> 可以通过 `clang -ccc-print-phases` 可以查看需要处理的 `action`，如下图：
>
> ![image-20230530222151220](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230530222151220.png)

**Bind: Tool & Filename Selection**：根据 `action` 选择对应的**工具**和**文件名**信息

> 通过 `clang -ccc-print-bindings` 可以查看对应的**工具**和**文件名**信息，如下图：
>
> ![image-20230530222234455](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230530222234455.png)

**Translate: Tool Specific Argument Translation**：根据输入的参数转为不同 `tool` 的参数

> 如下图所示：
>
> ![image-20230530221916345](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230530221916345.png)其各个工具的参数为：
>
> 1. `/usr/bin/clang-15 -cc1` 参数： `-triple x85_64-pc-linux-gnu`
> 2. `/usr/bin/ld` 参数： `-m elf_x86_64`

**Execute**：调用不同的 `tool` 执行任务。

该步骤会通过创建子进程方式调用`tool`

`clang driver` 最终会创建两个子线程 `clang-15 -cc1` 和 `ld` 执行最终的编译任务和链接任务

- `clang-15 -cc1` 可以将源码转为对象文件。本例中，`clang-15 -cc1` 会将 `.cc` 文件转为 `.o` 文件

> 以下 `clang-15` 均以 `clang` 代替

`clang` 的整体流程如下：

![image-20230530224019240](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230530224019240.png)

而 `clang driver` 的功能就是将这些步骤组装起来，

此流程形式化如下：

![image-20230530224449183](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230530224449183.png)

> 图片来源于 [文章](https://cloud.tencent.com/developer/article/1803206)



