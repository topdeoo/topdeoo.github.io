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

1. 文献搜索 & 阅读
2. 博客记录
3. 组会 Slides 制作
4. 科研代码
5. 日常开发与实验
6. 多端同步

这里，多端同步会掺杂在各个部分，可以选择自己需要的同步方法。

> 考虑到我已经切换回 Windows 开发，因此这里介绍的主要在 Windows 的工具链，关于纯 Linux 的分享可以参考 [Hyprland-Yes](../Hyprland-Yes) 与 [Manjaro-Linux](../Manjaro-Linux)，虽然主要是在玩赛博暖暖（

**!Attention** 很多工具其实都可以关注 `github` 上使用 `awesome` 开头的仓库，例如：

- [Awesome Typst 中文版](https://github.com/qjcg/awesome-typst/blob/main/README_ZH.md)
- [Awesome C++](https://github.com/fffaraz/awesome-cpp)

可以在这里关注一下 `Awesome` 列表：[The awesome list](https://github.com/sindresorhus/awesome#readme)

# 文献搜索 & 阅读

## 文献搜索

这个通常没有什么好用的工具（如果 Google 算工具的话），一般是在网站上找，这里推荐几个好用的网站和一些浏览器插件

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

安装的步骤省略，这里主要分享两个：

1. 插件
2. 如何多端同步

### 插件

**可以在 [Zotero 中文社区](https://zotero-chinese.com/plugins/) 查看推荐的插件以及安装方法**

这里推荐我使用的插件：

由于我没有 OpenAI 的账号，因此用不了 GPT 的 Token，否则很建议下载 _Awesome GPT_ 这个插件，用来替代翻译的插件

### 同步

一般而言，`Zotero` 提供的免费额度应该是够用的（100 MB），但也可以自定义存储方式，这里我使用的是 **坚果云** 的云端存储。

具体的操作可以参考坚果云官方的文章 [坚果云使用 Zotero 配置过程详解](https://help.jianguoyun.com/?p=4190)

> 可以不用安装坚果云的客户端，感觉其实很鸡肋，不如直接用 `WebDAV`
>
> 不过 `WebDAV` 也有一个缺点，就是坚果云会限制这个的使用次数，比如很短的时间内发送了巨量的请求，同步了一千个文件之类的，这样的话这个应用的 `Token` 就会被 ban 掉，需要重新生成一个 `Token`

# 博客记录

这里其实应该是 “博客与本地知识库”

## 关于博客

和网上大多数静态博客系统一样，我使用 **Markdown** 写博客，使用 **Hugo** 生成静态的 `html` 文件，然后通过 **Github Pages** 进行部署。

我使用的主题是 [Stack](https://github.com/CaiJimmy/hugo-theme-stack.git)，当然自己魔改了一部分，支持了一些新的特性（主要是卡片链接），可以参考 [魔改版本 Stack](https://github.com/topdeoo/hugo-theme-stack)

这个主题网上美化/配置的教程很多，想要使用的话还是很简单的，在这里不再赘述

最后，关于文章中的图片，我使用的是 [picgo](https://picgo.github.io/PicGo-Doc/zh/guide/) + 腾讯云对象存储，这样可以通过腾讯云的对象存储作为在线图床，就不用担心图片无法显示在公网上了

> 关于 picgo 如何配置，请阅读它的文档或者直接 Google 一下配置，教程也十分多

如果想知道如何在书写时自动上传，请往下阅读

## 关于 Markdown 的书写

我将博客还有一系列本地 Markdown 的书写与管理都集中在 [Obsidian](https://obsidian.md/) 之中，当然，如果你只是书写单个 `md` 文件的话，也可以使用 `Typora` 或者 `Marktext`，甚至 `vscode` 也是可以的，但如果你想连同笔记，博客，日记等等都在一起管理的话，那我推荐使用 `Obsidian`

关于 `Obsidian` 的教程也十分之多，这里我主要分享一些插件和网站：

#### 网站

- [PKMer Obsidian 插件集合](https://pkmer.cn/products/plugin/pluginMarket/)
- [Obsidian 插件汇总](https://ob.pory.app/)

#### 主题与插件

我使用的主题为 `Border` ，并使用了插件 `Style Setting` 进行了一些改造，但不是很多，感觉预设已经很够用了

字体使用的是：中文 [霞鹜文楷](https://github.com/lxgw/LxgwWenKai)，英文 [Bookerly](https://font.download/font/bookerly)，代码 [Monaco](https://github.com/thep0y/monaco-nerd-font)

页面显示如下：

插件主要有：

- `Pangu`：排版，用于中英文之间插入空格，强迫症患者福音
- `Admonition`：一种 `Callout`，例如什么 NOTE, WARNING 之类的引用框，主要是样式好看
- `Advanced Tables`： 表格编辑工具
- `Background Image`：背景图片
- `Calendar`：一个日历，需要配合插件
  - `dataview`
  - `Day Planner`
    进行使用，最简单的用法就是 `TODO List` ，今日待办之类的
- `Codeblock Customizer`：客制化代码块的显示
- `Excalidraw`：排名第一的画图插件（虽然我平时用的也不是很多）
- `Image auto upload Plugin`：和 picgo 一块使用的插件，在复制图片时可以直接上传到图床上，然后替换图片的 url
- `Lazy Plugin Loader`：插件的懒加载插件，快速启动 obsidian，防止加载插件卡住
- `Linter`：用来格式化（自动添加，更新）文件的 `yaml`，或者说 `frontmatter`
- `Open In New Tab`：打开一个新的标签页
- `Remotely Save`：远端同步，这里我使用的也是 坚果云 的 `WebDAV` 进行存储
- `Style Setting`： 上文所说的，客制化主题必备插件
- `Tasks`：更好的显示 `TODO List`

# 组会 Slides 制作

关于 `Slides` 的制作，有三种方式：

1. 传统的 `PPT`
2. `Beamer` 风格的学术 `Slides`
3. `Reval.js` 网页 `Slides`

三种方式可以自由选择，优缺点如下：

- `PPT` 的制作稍微简单，不需要做任何动画，也不需要花里胡哨的模板（很适合赶工的时候做），但缺陷很明显，数学和代码的支持很差，有时候只能截个图放上去，很不美观（不美观的数学公式会让人难以理解……也生不出看下去的欲望）
- `Beamer` 模板写起来困难，但数学公式和代码都较为美观，并且模板问题难以解决，毕竟不是每个人都有心思去做模板的
- `Reval.js` 强依赖于其他人写好的插件拓展，而且语法会有些啰嗦，虽然可以使用 Markdown 语法的话，但想要做出动画效果也同样得使用他自己的一些语法，好在支持数学公式和代码块，并且可以把 Slides 直接挂在网上

## Typst

首先，我们回答一个问题：**为什么选择 Beamer？**

答案是：**数学公式**

众所周知的是，`PPT` 对于数学的支持一向不友好，想打出漂亮的数学公式可能比做一份完整的 `PPT` 还费时间，所以，为什么不选择数学更友好更优美的 `Latex` 呢？

但，`Latex` 的入门是一个很大的问题，花费一个月的时间在折腾自己的模板上，还没弄明白的事情也常有发生，这个时候就要开始推荐 `Typst` 了。

但是 [Typst](https://typst.app/) 的出现让学术 `Slides` 变得更简单了！关于 `Typst`，一个简单的说法就是：`Markdown` 增强版本的 `Latex`

拥有着 `Markdown` 风格的语法，可以轻松的写出文档，同时也拥有较为强大的排版能力，值得注意的是 `typst` 的数学语法比 `Latex` 看起来要舒服很多，最重要的一点是，它是增量编译（人话：即时预览）

我们并不会在这里讲述太多 `Typst` 的语法细节，也不会告诉大家如何去学一门新的（编程）语言，遇到有不会的时候，请学会 `RTFM` 和 `STFW`

## 如何制作

如果你想使用 `Typst` 来制作 Slides 的话，可以使用[Polylux](https://polylux.dev/book/polylux.html) 或更加中文化（以及更加现代的）[Touying](https://touying-typ.github.io/)

随着 `Typst` 社区的发展，以及有很多包和模板可以使用了，例如：

- [pinit](https://typst.app/universe/package/pinit) 用于高亮文本块，并显示箭头
- [codly](https://typst.app/universe/package/codly) 更好看的方式显示代码块
- [cetz](https://typst.app/universe/package/cetz) 与 [fletcher](https://typst.app/universe/package/fletcher) 画图的必备利器，可以对标 `Latex` 中的 `TikZ`
- [lovelace](https://typst.app/universe/package/lovelace) 伪代码（算法流程）的制作
- [curryst](https://typst.app/universe/package/curryst) 我用来写规约/推导的数学公式的包

一个简单的例子如下：

# 科研代码

