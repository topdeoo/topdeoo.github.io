---
title: 差生文具店
math: true
date: 2024-10-27 03:18:10
categories:
  - InNight
cover: wallpaper/117165405_p1.png
comments: true
description: 科研&学习工具分享
---

# 前言

差生文具多系列，这里分享（备忘）一下我的科研+开发工作流以及工具链，主要涉及到：

1. 文献搜索&阅读
2. 博客记录
3. 组会 Slides 制作
4. 科研代码
5. 日常开发与实验
6. 多端同步

这里，多端同步会掺杂在各个部分，可以选择自己需要的同步方法。

> 考虑到我已经切换回 Windows 开发，因此这里介绍的主要在 Windows 的工具链，关于纯 Linux 的分享可以参考 [Hyprland-Yes](../Hyprland-Yes) 与 [Manjaro-Linux](../Manjaro-Linux)，虽然主要是在玩赛博暖暖（

# 文献搜索&阅读

## 文献搜索

这个通常没有什么好用的工具（如果 Google 算工具的话），一般是在网站上找，这里推荐几个好用的网站和一些浏览器插件：

### 网站

1. 出版社的官网：

   > 好处是省事，坏处是不知道自己学校买没买版权（
   >
   > 如果买了的话，可以通过 `Access via Institute` 来获取访问权限并下载，因为有些文章可能只能在官网上下载

2. 一些教授的主页

   > 典型的例子：https://leria-info.univ-angers.fr/~jinkao.hao/
   > 甚至可以在主页上找到文章的代码/可执行文件

3. [Sci-Hub](https://sci-hub.se/)

   > 需要挂梯子才能访问，文献量大但其实在 `CS` 领域的文章并没有特别多，较新的文章不一定能找到，好处是可以通过 `doi` 进行搜索查询

4. [Arxiv](https://arxiv.org/)

   > 不需要挂梯子，文献量大（可惜是预印本），几乎所有要发出去的 `CS` 领域文章都能在这里找到，较新的文章也一应俱全，缺点是因为是预印本，和出版社用的模板也不太一样，而且还得时刻注意作者有没有更新过（可能不是最新版），而且不能搜索 `doi`

5. [LibGen](https://www.libgen.is/)

   > 找图书的好去处，但会议期刊文献不推荐在这里找，你可以把这个网站视为秽土转生的 `zlib`

6. [semantic scholar](https://www.semanticscholar.org/)

   > 找文章&biblatex 的好去处，很多文章都可以提供 PDF 的连接，好用

7. [dblp](https://dblp.org/)

   > 同样是找文章的好去处，不需要翻墙就可以使用，个人觉得这个更偏向人肉某个老师，不太适合找某一个主题的文章

8. [Aminer](https://www.aminer.cn/)

   > 似乎是清华做的一个网站，感觉在可视化和联想以及 AI 上做的不错，之前用过这个网站的 AI 读文章功能，这个网站也有对应的 Google 插件

### 插件

CCF-Rank，一个浏览器插件，可以在 Google 的浏览器商店里找到：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20241028183210.png)

其作用如下，可以显示文章，会议的 CCF 等级（包括 semantic scholar， dblp，google scholar 上面的文章）

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20241028184006.png)

## Zotero

[Zotero](https://www.zotero.org/) 作为我文献收集与阅读的工具

### 简介

> Your personal research assistant
>
> Zotero is a free, easy-to-use tool to help you collect, organize, annotate, cite, and share research.

选用原因：开源免费（当然存储需要付费），插件生态丰富，跨平台（Linux/Windows/MacOS），多端同步
