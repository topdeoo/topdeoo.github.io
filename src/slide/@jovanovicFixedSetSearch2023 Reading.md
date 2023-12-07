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

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312070905915.png)
<!-- .element: class="r-stretch" -->

其中，种群 $\mathcal{P}$ 是由初始化算法生成的 $N$ 个初始解。

---

## Inital Solution

我们使用 `Randomized Greedy` 来产生初始解，显然这需要我们定义一个打分函数。

--

<!-- .slide: data-auto-animate -->

## Score Function

于是，我们考虑将顶点 $v$ 加入到团 $c_i$ 的收益为 $Add(v, c_i) = \sum_{u\in c_i}w_{uv}$ 

于是，算法如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312070914809.png)
<!-- .element: class="r-stretch" -->

--

<!-- .slide: data-auto-animate -->


![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312070924400.png)
<!-- .element: class="r-stretch" -->

这里使用了受限候选列表（`RCL`）来维护加入的顶点

`RCL` 维护了一个长度为 $\alpha$ 的优先队列，内部元素为对部分解 $\mathcal{C}$，其 $Add(v, c_i)$ 最大的前 $\alpha$ 个二元对。

如果有分数相同的，随机选一个加入队列即可。

--

<!-- .slide: data-auto-animate -->


![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312070924400.png)
<!-- .element: class="r-stretch" -->

每次迭代，随机从 `RCL` 队列中选择一个分数最高的二元对 $(v, c_i)$，表示需要将 $v$ 加入到团 $c_i$ 中。

---

## Heuristics Function

考虑将 $v$ 当前在团 $c_i$ 中，我们将 $v$ 从 $c_i$ 移到 $c_j$ 的操作定义为$Move(v, c_j)$，其分数记作：

$Move(v, c_j) = Remove(v, c_i) + Add(v, c_j) = -\sum_{u\in c_i}w_{uv} + \sum_{u\in c_j}w_{uv}$ 

于是，我们需要寻找 $v$ 满足 $MaxMove(v) = \max_{c_j\in candi(v)}{Move(v, c_j)}$，其中 $candi(v) = C - \{c(v)\}$，即团中除去 $v$ 当前所在的团。

--

<!-- .slide: data-auto-animate -->

这里新增加了两种二元操作：

1. `Push`
2. `Edge`

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312070949921.png)
<!-- .element: class="r-stretch" -->

考虑两个来自不同团的顶点 $u, v$，而此时我们需要将 $v$ 移到团 $c_j$ 中，把 $u$ 移到团 $c(v)$ 中，此操作定义为：

$Push(u, v, c_j) = Move(v, c_j) + Move(u, c(v)) + \pi^{j}_{uv}$ 

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312070949921.png)


![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312070958159.png)
<!-- .element: class="r-stretch" -->

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071004644.png)
<!-- .element: class="r-stretch" -->

考虑两个顶点 $u, v$，此时我们需要将这两个顶点都移入团 $c_j$ 中，注意 $c_j \not = c(v), c(u)$ ，此操作定义为：

$Edge(u, v, c_j) = Move(u, c_j) + Move(v, c_j) + \epsilon^j_{uv}$ 

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071004644.png)
<!-- .element: class="r-stretch" -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071007527.png)
<!-- .element: class="r-stretch" -->

--

于是，基于上述操作，我们定义两个启发函数：

$MaxPush(u, v) = \max_{c_j \not = c(v)}{Push(u, v, c_j)}$ 
$MaxEdge(u, v) = \max_{c_j \not = c(v), c(u)}{Edge(u, v, c_j)}$ 

整体的启发函数定义为：

$MaxDual(u, v) = \max{(MaxMove(v), MaxPush(u, v), MaxEdge(u, v))}$

---

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071040783.png)
<!-- .element: class="r-stretch" -->

---

<!-- .slide: data-auto-animate -->

### GRASP

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071044998.png)
<!-- .element: class="r-stretch" -->

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071044998.png)
<!-- .element: class="r-stretch" -->

这里使用的 `SDLS` 过程为：

对 $V$ 中所有的 $v$，都尝试一次领域间的 $MaxMove(v)$，查看是否能够获得更好的解。

这里返回了 `GRASP` 产生的最优解，以及一个大小为 $N$ 的种群。

---

<!-- .slide: data-auto-animate -->

在 `GRASP` 中，我们已经产生了大小为 $N$ 的种群，现在的问题在于如何评价个体的优劣。

首先，对于一个划分 $C$，我们定义函数 `Same` 如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071047791.png)

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071047791.png)
<!-- .element: class="r-stretch" -->

而对于两个不同的解 $\mathcal{C}, \mathcal{\hat{C}}$，我们定义 `fit` 函数如下：

$fit(v, \mathcal{C}, \mathcal{\hat{C}}) = \frac{\sum_{u\in c_i}Same(v, u, \mathcal{\hat{C}})}{|c_i|}$

其中，$c_i \in \mathcal{C}$ 

--

<!-- .slide: data-auto-animate -->

$fit(v, \mathcal{C}, \mathcal{\hat{C}}) = \frac{\sum_{u\in c_i}Same(v, u, \mathcal{\hat{C}})}{|c_i|}$

其中，$c_i \in \mathcal{C}$ 

而在 `FSS` 中，我们需要选出最好的 $n$ 个解集中的 $k$ 个元素 $S_{kn}$，通过上述函数的拓展，我们可以对一个顶点 $(v, c(v)) \in \mathcal{C}$ 在 $S_{kn}$ 中的适应程度：

$fit(v, \mathcal{C}, S_{kn}) = \sum_{\mathcal{\hat{C}}\in S_{kn}}fit(v, \mathcal{C}, \mathcal{\hat{C}})$

---

<!-- .slide: data-auto-animate -->
### FSS

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071109774.png)
<!-- .element: class="r-stretch" -->

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071109774.png)
<!-- .element: class="r-stretch" -->

每次迭代，我们都会有一个候选解集合 $S_{kn}$ 和一个基础解集 $B$，我们从 $B$ 中选出 $fit$ 最高的 $Portions \times |B|$ 个元素到集合 $F$ 中，组成一个部分解。

也就是 $fit(v, B, S_{kn})$ 最大的前 $Portions \times |B|$ 个元素。

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071109774.png)
<!-- .element: class="r-stretch" -->

随后，通过 `GRASP` 将这个解集补全，然后继续加入到种群中。

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071109774.png)
<!-- .element: class="r-stretch" -->

但随着迭代的进行，`Portions` 的值也会增加（当`MaxStag` 次没有提高解的质量时），我们会增加 `Portions` 的值，从而增加 `F` 集合的大小。

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071109774.png)
<!-- .element: class="r-stretch" -->

`Portions` 的定义为：

$Portion_i = (1 - \frac{1}{2^i})$ 

---

#### Eval

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071119443.png)
<!-- .element: class="r-stretch" -->

--

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312071120637.png)
<!-- .element: class="r-stretch" -->

@slideend
