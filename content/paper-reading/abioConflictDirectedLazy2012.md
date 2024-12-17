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
