---
author: Jian Gao, Yiqi Lv, Minghao Liu, Shaowei Cai, Feifei Ma
date: "2023-12-04 17:33:40"
email: virgiling7@gmail.com
layout: Slide
tags: null
title: Improving Simulated Annealing for Clique Partitioning Problems
---
<!--more-->

@slidestart

## Improving Simulated Anneling 4 CPP

Read this paper [here](https://www.jair.org/index.php/jair/article/view/13382)

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

## SA Framework

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312061658597.png)
<!-- .element: class="r-stretch" -->
其中，$T_k$ 为终止温度，$\theta_{cool}$ 为降温系数。

--

可以发现，朴素的 SA 框架没有任何的禁忌搜索策略，其跳出循环状态完全通过随机的方式跳出。我们很容易遇见如下情况：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312061715947.png)
<!-- .element: class="r-stretch" -->

---

## Configuration Checking

在 [NuMVC](https://arxiv.org/pdf/1402.0584.pdf) 中使用的 `Configuration Checking` 可以很好的解决循环搜索的问题。

在 `NuMVC` 中其策略为，对于 $cc_v = 1$ 的顶点 $v$ ，我们可以加入解集中，否则，我们不能加入。

由于 `Configuartion` 的定义很灵活，因此可以根据问题来定义不同的格局。

--

### Configuration Def

在之前使用 `cc` 的问题中，其格局都定义为：对当前点 $v$ ，其邻居的状态。

但无论怎样，其定义都是 `neighbor-based` 的，但对于 `CPP` 问题，其实例中完全图较多

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312061736754.png)
<!-- .element: class="r-stretch" -->

因此，如果我们依然像之前一样定义的话，那么对于一个顶点 $v$, 其 $config(v) = N(v) = V$

--

## Redef

由于我们每次只操作一个顶点 $v$，考量将 $v$ 移动到哪个团 $c_i$ 中去（注意，$c_i = \varnothing$ 是可以的)，而搜索状态我们可以看作是团 $c_i$ 中的所有顶点。

如果在上一步我们将 $v$ 移出 $c_i$，在这一步显然我们不能把 $v$ 又重新放回去。

换而言之，**只有当 $c_i$ 在 $v$ 移除后有新顶点被加入，我们才能够把 $v$ 移入 $c_i$**

--

因此，我们给出格局的定义：

对于 $c_i$ 中的顶点 $v$，其格局定义为 $config(v, c_i) = \cup_{u \in c_i}\{u\} - \{v\}$，也就是团 $c_i$ 中除 $v$ 外的所有顶点。

---

## Configuration Checking

显然，我们不应该去维护一个集合，因为我们只关心自从 $v$ 移出 $c_i$ 后，$c_i$ 是否有任何改变，对于这一点，显然我们可以通过时间轴这一概念来实现。

--

### Timestamp-based Config

由于我们每次只需要操作一个顶点，所以，我们可以知道操作这个顶点时影响了哪些团的状态，并且记录下影响的时间。

通过比较时间的先后，我们就可以知道格局是否发生了变化。

--

考虑如下矩阵和向量：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312061856432.png)

其对应的图为

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312061856167.png)
<!-- .element: class="r-stretch" -->

--

因此，当我们要将 $v$ 移入 $c_i$ 时，我们只需要查看 $config(v, c_i) < config(c_i)$

也就是 $c_i$ 状态改变的时间是否晚于 $v$ 移出 $c_i$ 的时间

---

## Improvment

通过实验发现，如果接受了目标函数减小的移动，会导致某些顶点不稳定，回退至之前的状态。

那么我们还是会重复搜索，所以，我们对格局进行进一步的修改

--

我们将 $config(v, c_i)$ 定义为一个二元对 $<tsvertex(v), tscluster(c_i)>$

$tsvertex(v)$ 表示 $v$ 最后一次有非负增益的时间
$tscluster(c_i)$ 表示 $c_i$ 最后一次非负增益移动后与 $c_i^{*}$ 不一样的时间

根据先前的定义，显然只有当 $tscluster(c_i) > tsvertex(v)$ 时，$v$ 才允许被移动到 $c_i$ 中

---

<!-- .slide: data-auto-animate -->
## SACC

问题求解的框架如图所示：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312061913268.png)
<!-- .element: class="r-stretch" -->

paper中并没有给出初始解如何随机生成，感觉应该不是 `FSS` 中复杂度为 $O(|V|^3)$ 的贪心

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312061913268.png)
<!-- .element: class="r-stretch" -->

每次迭代都会降低初始温度，然后使用提高效率的 `SA` 算法进行求解。

这是因为在实验中发现，通过降低初始温度，能够很好的提高算法的收敛速度，随着初始温度的不断减小，搜索空间变小，收敛速度加快。

---

<!-- .slide: data-auto-animate -->

## SA_CC

模拟退火部分的框架如下所示：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312061921474.png)
<!-- .element: class="r-stretch" -->

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312061921474.png)
<!-- .element: class="r-stretch" -->

开始时，将 $tsvertex(v)$ 全置为 $0$, $tscluster(c_i)$ 全置为 $1$

随后，开始 `SA` 算法。

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312061921474.png)
<!-- .element: class="r-stretch" -->

首先，随机选一个顶点 $v$，然后，通过 `BestCluster` 找到把此顶点转移过去的收益最大的团 $c_b$

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312061921474.png)
<!-- .element: class="r-stretch" -->

然后计算势能 $\Delta$ ，而如果是非负移动的话，我们会接受此次移动，并且更新格局，否则以一定概率接受，并且不会更新格局

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312061921474.png)
<!-- .element: class="r-stretch" -->

最后，更新最佳解决方案。如果找到更好的解决方案，我们应用下降搜索方法，进一步增强解决方案以找到局部最优。

---

## BestCluster

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312062247941.png)
<!-- .element: class="r-stretch" -->

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312062247941.png)
<!-- .element: class="r-stretch" -->

这里，$candi(v)$ 表示 $C\cup \{\varnothing\} - \{c(v)\}$，也就是除去当前顶点 $v$ 所在的团，剩下的所有团（有可能为空集）。

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312062247941.png)
<!-- .element: class="r-stretch" -->

给定顶点 $v$，算法检查 $candi(v)$ 中的所有团，对每个团 $c^{\prime}$，如果格局允许移动，那么考虑将 $v$ 移到 $c^{\prime}$ 中带来的效益（势能）$\Delta$，并找到最大的 $\Delta$

---

<!-- .slide: data-auto-animate -->

## DescentSearch

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312062259034.png)
<!-- .element: class="r-stretch" -->

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312062259034.png)
<!-- .element: class="r-stretch" -->

对每个顶点 $v$ ，尝试将顶点移动到所有其他团 $c^{\prime}$，并选出增量最大的团作为目标，并更新当前解。

重复选择和移动，直到没有可以改善目标的顶点移动。

---

## Experiments

对比算法与 `MDMCP` 中的算法一致，也和 `MDMCP` 进行了对比，其使用的实例如图

> 注意，此算法的退火参数与 `MDMCP` 的参数保持一致，除了独有的 $\alpha_{temp} = 0.98$

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312062307221.png)
<!-- .element: class="r-stretch" -->

--

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312062307976.png)
<!-- .element: class="r-stretch" -->

--

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202312062308262.png)
<!-- .element: class="r-stretch" -->


@slideend

