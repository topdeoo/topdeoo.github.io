---
title: 差生文具店（第二集）
description: 科研&学习工具分享
tags:
  - 一些随笔
  - 环境配置
date: 2024-10-27
lastmod: 2024-12-15
draft: false
---

# 前言

差生文具多系列，这里分享（备忘）一下我的科研+开发工作流以及工具链，主要涉及到：

1. 文献搜索 & 阅读
2. 博客记录
3. 组会 Slides 制作
4. 科研代码
5. 日常开发与实验
6. 多端同步

[[my-tools-1|前文]] 已经介绍了 1~4 的内容，本篇介绍后面两个内容

> 其实多端同步已经差不多结束了，主要是通过坚果云的 WebDAV 进行同步的

# 日常开发与实验

这里的日常开发就不包括如何写各类公开课的实验了，最简单的方法就是使用 WSL，在 WSL 里随便玩，反正环境坏了也可以重装。

## 日常开发

由于我在两台设备上进行开发，虽然都是 wsl 环境（写 C/C++ 的暂时不考虑 Windows），所以多端的同步比较重要。

首先，确保 WSL 的版本与发行版一致，我选择的都是 WSL2 和 Ubuntu-24.04

我使用 `github` 来进行同步，步骤如下：

1. 新建一个私有仓库
2. 把 remote 的地址链接到两个电脑上
3. 写完一个小版本后开始同步

注意，最好的方式是写完一个版本开始同步，但我们经常会存在功能一天写不完，晚上下班回去之后可能还会写一写的需求，我的做法是：

1. 新建一个分支
2. 提交暂存，然后同步
3. 在这个分支上写完一整个功能后，向主分支提 pr，然后把 commit 历史 squash 再进行合并

这样就能保证主分支确实是一个功能一次 commit，保证 commit 清爽

> 关于如何写 commit，可以参考文章 [Git Commit message 编写指南](https://help.gitee.com/enterprise/code-manage/Git%20%E7%9F%A5%E8%AF%86%E5%A4%A7%E5%85%A8/Git%20Commit%20message%20%E7%BC%96%E5%86%99%E6%8C%87%E5%8D%97)

## 实验

由于组内服务器的使用不是每个人一个账号，并且也没有使用容器，总体来说比较随意（这样可能也会出现一些装环境的时候把服务器跑崩的问题，但鉴于组内没有做 system 的，其实这个风险也没有太大）

我的做法一般是，从 github 上 clone 我的代码 ，运行自己编写的 `Dockerfile` 和 `docker-compose.yml`，这样方便管理，因为一个文件夹就是一个容器（或者好几个容器，取决于实验的设计）

### 怎么跑实验

一次可能需要跑好多 `benchmark` ，一个 `benchmark` 可能需要跑好几遍取平均，所以基本上是多进程跑，可以写一个 `bash` 脚本来做到这一点，例如：

```bash
./main -f data/instance/xxxx1.in -o eval/instance/1/xxxx1.out
./main -f data/instance/xxxx2.in -o eval/instance/1/xxxx2.out
./main -f data/instance/xxxx3.in -o eval/instance/1/xxxx3.out
./main -f data/instance/xxxx4.in -o eval/instance/1/xxxx4.out
./main -f data/instance/xxxx5.in -o eval/instance/1/xxxx5.out
./main -f data/instance/xxxx6.in -o eval/instance/1/xxxx6.out
```

可以通过命令：`cat run.sh | xargs -P60 -d'\n' -n1 bash -c` 来并行执行

`xargs -P60 -d'\n' -n1 bash -c`

- `xargs`  是一个命令，用于从标准输入读取数据，并将其作为参数传递给另一个命令
- `-P60`  选项：`xargs`  会并行地运行最多 60 个进程。这意味着  `xargs`  会同时启动 60 个  `bash -c`  进程来处理输入
- `-d'\n'`  选项：指定输入的分隔符为换行符  `\n`。这意味着  `xargs`  会将输入的每一行作为一个单独的参数
- `-n1`  选项：指定每次传递给  `bash -c`  的参数数量为 1。这意味着  `xargs`  会将每一行作为一个单独的命令传递给  `bash -c`
- `bash -c`：`bash -c`  是一个命令，用于在新的 shell 中执行指定的命令。`-c`  选项后面跟着的是要执行的命令字符串

> **但是，如何产生这个 `run.sh` 又成为一大问题**

这里我介绍一种很简单的方法：Python

我们可以让 LLM 写一个简单的 Python 脚本，遍历实例文件夹，来生成 `run.sh` ，例如一个 `generate_run_cmd.py` 简单如下：

```python
import glob
import os

l = glob.glob("data/**/*.graph", recursive=True)

cmd = "./bin/Release/net8.0/fss {} > {}"

output_dir = "solution/"
os.makedirs(output_dir, exist_ok=True)

cmds = []
for f in l:
    output_dir = "solution/"
    if f.endswith(".graph"):
        output_dir += f.split("/")[-2]
        os.makedirs(output_dir, exist_ok=True)
        output_file = output_dir + '/' + os.path.basename(f).replace(".graph", ".sol")
        cmds.append(cmd.format(f, output_file))

with open("scripts/run.sh", "w+") as f:
    for c in cmds:
        f.write(c + "\n")

```

然后，我们可以再写一个 `start` 的脚本如下：

```bash
#!/bin/bash
python3 scripts/generate_run_cmd.py
cat run.sh | xargs -P60 -d'\n' -n1 bash -c
```

这样就可以一行命令 `bash start` 跑完一次实验了

当然，这个自动化流程本质上还有很多不足，后续可能还会借鉴 CI/CD 的一些技巧做优化

### 怎么统计数据

这部分当然没有其他的路子，最简单的方法就是 LLM + Python，例如一个简单的 `stats.py` 如下所示：

```python
import glob
import re

solution_lists = glob.glob('solution/*/**.sol', recursive=True)

pattern = r'\[solution\]\s+(\d+)\s+\[time\]\s+(\d+\.\d+)\s+us'

result = []


for file in solution_lists:
    with open(file, 'r') as f:
        content = f.readline().strip()
        match = re.search(pattern, content)
        if match:
            solution_size = match.group(1)
            time = match.group(2)
            result.append(
                {
                    "instance": file.split('/')[-1].split('.')[0],
                    "solution_size": solution_size,
                    "time(us)": time
                }
            )
        else:
            result.append(
                {
                    "instance": file.split('/')[-1].split('.')[0],
                    "solution_size": "N/A",
                    "time(us)": "TLE"
                }
            )

import pandas


df = pandas.DataFrame(result)
df.to_csv('solution_results.csv', index=False)

```

当然，你必须要做的事情就是：**格式化输出**

例如上面的例子中，我的输出被格式化为

```plaintext
[solution] 1035 [time] 8031755250.422 us
```

总之，Python 很好用，尤其在这种小事情上，Python + LLM 可以省下很多统计数据的时间，甚至还可以直接画图

> [!info]
>
> 如果你想使用中间数据，那也可以使用 `jupyter` ，这也是十分推荐的方式，因为脚本很小，数据量也不算很大，比深度学习友好很多，甚至你还可以写一点实验结果的分析在笔记上，防止自己的灵感忘记了

# 小结

这个系列可能还会继续，如果后续遇到什么有意思的工具或者其他的，有心情的话还会再写一些，其实上面有很多都是略写，主要是因为很多文具我自己也没有用的很得心应手，只是用一些皮毛功能罢了（
