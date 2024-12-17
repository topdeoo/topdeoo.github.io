---
title: Conflict Directed Lazy Decomposition
description: 
tags:
  - 论文阅读
  - 约束求解
  - SAT
date: 2024-12-17
lastmod: 2024-12-17
draft: false
zotero-key: W57CN6LV
zt-attachments:
  - "888"
citekey: abioConflictDirectedLazy2012
---

> [!tldr] > [文章链接](http://link.springer.com/10.1007/978-3-642-33558-7_8)

# Conflict Directed Lazy Decomposition

> [!summary]
>
> Two competing approaches to handling complex constraints in satisfaction and optimization problems using SAT and LCG/SMT technology are: decompose the complex constraint into a set of clauses; or (theory) propagate the complex constraint using a standalone algorithm and explain the propagation. Each approach has its beneﬁts. The decomposition approach is prone to an explosion in size to represent the problem, while the propagation approach may require exponentially more search since it does not have access to intermediate literals for explanation. In this paper we show how we can obtain the best of both worlds by lazily decomposing a complex constraint propagator using conﬂicts to direct it. If intermediate literals are not helpful for conﬂicts then it will act like the propagation approach, but if they are helpful it will act like the decomposition approach. Experimental results show that it is never much worse than the better of the decomposition and propagation approaches, and sometimes better than both.

# 全局约束

我们首先介绍两种约束类型：

1. 基数约束
   考虑变量集合 $X = \{ x_1, x_2 \dots, x_n\}$，我们有如下约束：
   $$
   x_1 + x_2 +\dots+x_n \# K
   $$
   其中，$K \in \mathbb{R}, x_i \in \{0, 1\}, \#  \in \{\leq, \geq =\}$
2. 伪布尔约束
   考虑变量集合 $X = \{ x_1, x_2 \dots, x_n\}$，我们有如下约束：
   $$
   a_1x_1 + \dots + a_nx_n \# K
   $$
   其中，$a_i, K \in \mathbb{R}, x_i \in \{0, 1\}, \#  \in \{\leq, \geq =\}$

这两种约束，其约束的集合均为变量集合，因此被称为全局约束

对于这两类常见的全局约束，我们常用的有两种方法：

1. encoding or decomposition：编码为 SAT，使用 SAT 求解器进行求解
2. [[#Lazy Clause Generation]]：使用 SMT 方法进行求解，这里我们简称为约束传播

这两种方法均有其优势，考虑以下两种情况：

- 考虑一个由上百条基数约束构成的问题，如果我们将其编码为 SAT，会引入巨量的辅助变量与子句，使得求解效率急速降低，这个时候如果使用 SMT 中的约束传播方法就会快很多
- 考虑一个基数约束 $\sum_i x_i \leq K$ 的问题，但这个问题中的一些子句可以推导（归结）出以下约束 $\sum_i x_i \geq K + 1$ ，使得问题直接变成 UNSAT，这个时候对于约束传播算法，我们无法快速找到矛盾，可能需要枚举所有可能的结果来证明问题是 UNSAT 的，但如果我们编码为 SAT 问题，我们甚至可以在预处理阶段就发现这个矛盾

我们的基本假设是：**对于每个问题，将其编码为 SAT 时都会产生一些有助于 SAT 求解的辅助变量以及另一部分加大求解难度的无用辅助变量**

那么，在编码时，我们能否只生成那些对 SAT 求解有帮助的辅助变量呢？

# Lazy Clause Generation

我们首先介绍什么是 [[Lazy Clause Generation]]

> [!tldr]
>
> 对于一个由公式 $F$ 与一个约束集合 $\{c_i\}$ 构成的约束满足问题，LCG 由两部分组成：SAT 求解器和每个约束 $c_i$ 的传播算子。 SAT 求解器判定公式是否可满足并给出满足赋值，传播算子推导赋值的结果和约束集（即约束传播），并为 SAT 求解器提供一些传播文字的原因（称为解释）。

# 基数约束的传播与编码

## 传播

对于一条至多约束，例如 $\sum^{n}_{i}x_i \leq K$，传播算子会维护一个值 $couter(\sum^{n}_{i}(x_i = 1))$ ，保证这个值不大于 $K$ ，每当 SAT 求解器为一个变量 $x_i$ 赋值后，传播算子会维护所有出现变量 $x_i$ 的约束中的计数器。

当计数器的值达到 $K$ 时，由于不会再有其他的变量为真了，于是传播算子将约束中剩余的变量全部赋值为假，并进行约束传播。

对于至少类型的约束，$\sum^{n}_{i}x_i \geq K$，我们只需要维护为假的变量个数即可，当为假的变量个数达到 $n - K$ 时，传播算子会将剩余未被赋值的变量全部赋值为真，并进行传播。

## 编码

这里采用 `Cardinality Network` 的方法来编码

### Cardinality Network

`Cardinality Network` 是通过 2-comparators 来构建的，一个比较算子的电路结构为 $2-comp(x_1, x_2, y_1, y_2)$，其中，$x_1, x_2$ 为输入，$y_1, y_2$ 为输出，满足以下约束：

$$
y_1 = x_1 \vee x_2, y_2 = x_1 \wedge x_2
$$

这个电路能够很轻松的编码为 SAT，对于 $\geq$ 约束而言：

$$
\begin{aligned}
\neg x_1 &\vee y_1 \\
\neg x_2 &\vee y_1 \\
\neg x_1 \vee &\neg x_2 \vee y_2
\end{aligned}
$$

对于 $\leq$ 约束而言：

$$
\begin{aligned}
\neg x_1 &\vee \neg y_2 \\
\neg x_2 &\vee \neg y_2 \\
x_1 \vee & x_2 \vee \neg y_1
\end{aligned}
$$

`Cardinality Network` 是一个通过 $K$ 个比较算子连接起来的电路结构，有 $n$ 个输入和输出，且需要满足以下两个性质：

1. 为真的输出个数与为真的输入个数相同
2. 对任意 $1 \leq i \leq k$ ，当且仅当电路的输入至少有 $i$ 个为真时，第 $i$ 个输出才为真

### 编码过程

考虑以下例子：

$$
x_1 + \dots + x_4 \geq 3
$$

我们构造一个 $K + 1$ 的`Cardinality Network`如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20241217175417.png)

这个电路可以很轻易的表述为 SAT 子句的形式，最后，根据基数约束，由于输入至少三个为真，于是输出也至少有三个为真，于是第 $3$ 个输出是真

我们只需要最后加上一条单元子句，使得第三个输出为真即可。

# 懒编码

Lazy Decomposition 的做法与 LCG 的很相似，本质上是一个 LCG 与编码的结合求解方法，与 LCG 不同的是，LCG 的传播算子只做传播和推导（或者说解释），但 Lazy Decomposition 中的传播算子除了传播外，还需要探测编码哪些变量为 SAT 对求解是有帮助的。

一个 Lazy Decomposition 求解器必须要做到以下几点：

1. （动态地）识别编码哪些变量有助于学习子句的生成
2. 无论约束有没有被编码（或者被部分编码），算子都必须能够正确进行约束传播
3. 避免传播当前编码的约束
