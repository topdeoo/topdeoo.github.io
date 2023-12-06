---
title: Fixed set search applied to the clique partitioning problem
author: Raka Jovanovic, Antonio P. Sanfilippo, Stefan Voß
layout: Slide
date: 2023-12-04 17:33:40
---
@slidestart

# FSS 4 CPP

Read this paper [here](https://linkinghub.elsevier.com/retrieve/pii/S0377221723000802)

---

<!-- .slide: data-auto-animate -->
## CPP Def

给定一个图 $G = <V, E, W>$，我们期望找到一个顶点划分 $C$，将图划分为 $k$ 个互不相交的团（完全子图），并且所有团的边权和最大。

--

<!-- .slide: data-auto-animate -->

## CPP Def

即 $C = (c_1, c_2, \dots, c_k)$ ，$\forall 1 \leq i, j \leq k, i\not = j, c_i \cap c_j = \varnothing$ 且 $c_i, c_j$ 均为团
$\max{f(C)} = \max{\sum_{c\in C}(\sum_{i,j\in c}w_{ij})}$  


---

## FSS Framework

`FSS` 的框架如下所示：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312062335257.png)
<!-- .element: class="r-stretch" -->

其中，种群 $\mathcal{P}$ 是由初始化算法生成的 $N$ 个初始解。


@slideend
