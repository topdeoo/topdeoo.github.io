---
title: NJU ICS PA-0
math: true
date: 2023-07-16 21:54:47
tag:
  - NJU
  - OS
category:
  - 关于OS的一些零零碎碎
  - NJU
cover: https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230716221813.png
---

> `ICS PA` 的实验环境准备

<!--more-->

# 实验环境

按照

```card
title: NJU ICS PA 0
link: https://nju-projectn.github.io/ics-pa-gitbook/ics2022/pa0/
```

中的提示即可完成。

由于本人的系统为 `Manjaro`，因此并不需要安装双系统，这里直接开始搭建软件环境。

# 模拟器构建

对于 `git` 的配置，由于已经配置完成，如果无法配置的话请 `STFW`，在命令行输入：

```bash
git clone -b 2022 git@github.com:NJU-ProjectN/ics-pa.git ics2022
```

随后

```bash
cd ics2022
```

由于本人使用的 `shell` 为 `zsh`，因此需要更改 `init.sh` 的 `addenv()` 如下：

```bash
function addenv() {
  sed -i -e "/^export $1=.*/d" ~/.zshrc
  echo "export $1=`readlink -e $2`" >> ~/.zshrc
  echo "By default this script will add environment variables into ~/.zshrc."
  echo "After that, please run 'source ~/.zshrc' to let these variables take effect."
  echo "If you use shell other than bash, please add these environment variables manually."
}
```

随后运行：

```shell
git branch -m master
bash init.sh nemu
bash init.sh abstract-machine
source ~/.bashrc
```

然后检查环境变量是否正确：

```shell
echo $NEMU_HOME
echo $AM_HOME
cd $NEMU_HOME
cd $AM_HOME
```

如果 `cd` 命令未报错，则说明配置是正确的

创建新分支：

```shell
git checkout -b pa0
```

> 修改 `Makefile` 中的 
>
> 1. STUID
> 2. STUDENT
>
> 然后进行一次 `git` 提交

运行如下命令

```shell
cd nemu
make menuconfig
```

随后，会出现一个弹窗，请不要修改任何配置，选择 `Exit` 后，选择 `Yes` 退出，系统会自动生成一个 `.config` 的文件，随后运行

```shell
make
```

至于其他的配置与用法，在文档中写的都很详细，请时刻记住 `RTFM`
