---
title: 伪布尔优化中的分布式 QAOA 算法
description: 
tags:
  - 论文阅读
  - 量子算法
  - 组合优化
date: 2024-12-12
lastmod: 2024-12-16
draft: false
zotero-key: FS3KXWKE
zt-attachments:
  - "919"
citekey: yueLocalGlobalDistributed2023
---

> [!tldr]
>
> [文章链接](http://arxiv.org/abs/2310.05062)
> 主要的贡献为：
>
> 1.  将 PBO 问题编码为 QAOA 的形式
> 2.  将 QAOA 分割为子问题进行分布式求解

# 论文标题与摘要

**Local to Global: A Distributed Quantum Approximate Optimization Algorithm for Pseudo-Boolean Optimization Problems**

> [!abstract]-
>
> With the rapid advancement of quantum computing, Quantum Approximate Optimization Algorithm (QAOA) is considered as a promising candidate to demonstrate quantum supremacy, which exponentially solves a class of Quadratic Unconstrained Binary Optimization (QUBO) problems. However, limited qubit availability and restricted coherence time challenge QAOA to solve large-scale pseudo-Boolean problems on currently available Near-term Intermediate Scale Quantum (NISQ) devices. In this paper, we propose a distributed QAOA which can solve a general pseudo-Boolean problem by converting it to a simplified Ising model. Different from existing distributed QAOAs' assuming that local solutions are part of a global one, which is not often the case, we introduce community detection using Louvian algorithm to partition the graph where subgraphs are further compressed by community representation and merged into a higher level subgraph. Recursively and backwards, local solutions of lower level subgraphs are updated by heuristics from solutions of higher level subgraphs. Compared with existing methods, our algorithm incorporates global heuristics into local solutions such that our algorithm is proven to achieve a higher approximation ratio and outperforms across different graph configurations. Also, ablation studies validate the effectiveness of each component in our method.

# 伪布尔优化简介

## 伪布尔优化形式及其松弛形式

一个伪布尔优化的目标函数可以表示为如下形式（不考虑常数项）：

$$
f_0(x_1, x_2, \dots, x_K) = \sum_ia_ix_i + \sum_{i<j}a_{ij}x_ix_j + \dots
$$

我们可以把这种形式进行改写：

$$
f_0(x_1, x_2, \dots, x_K) = \sum_{\mathcal{S}_0^l \in 2^{[K]}}c_l\prod_{i \in \mathcal{S}^l_0 }x_i
$$

其中，$K$ 表示出现在目标函数中的变量数，$[K]$ 表示集合$\{1, 2, 3, \dots, K\}$， $2^{[K]}$ 表示集合 $[K]$ 的幂集的一个子集（这是因为，即：

$$
2^{[K]} = \{\emptyset, \{1\}, \{2\}, \dots, [K] \}
$$

于是 $\mathcal{S}_0^l$ 表示幂集中的元素，其中 $l$ 为子集的标签（也就是函数中的某一项），$c_l  \in \mathbb{R}$ 表示项的系数

> [!example]-
>
> 例如：
>
> $$
> f_0(x_1, x_2, x_3) = x_1 + 2 \times x_3 + 4 \times x_2x_3
> $$
>
> 这里，$[K] = \{1, 2, 3 \}$，$2^{[K]} = \{ \{1\}, \{3\}, \{2, 3\} \}$，我们的 $l \in [L] = \{1, 2, 3\}$（也就是幂集子集的大小），于是我们有（均按照函数项的顺序给出）：
>
> $$
> \begin{aligned}
> \mathcal{S}^l_0 &\in \{\{1\}, \{3\}, \{2, 3\}\} \\
> c_l &\in \{1, 2, 4\}
> \end{aligned}
> $$

那么对于 PBO 问题，我们还存在多条约束（假设均为 $\leq 0$ 的类型），我们可以将约束统一松弛为一种形式：

$$
g_i(x_1, x_2, \dots, x_N) = 0
$$

这里的 $N$ 为变量的总数（注意，$K \leq N$，这是因为在松弛时，我们会引入新变量）

例如约束：

$$
x_1 + x_2 \leq 1
$$

我们可以引入一个新的布尔变量 $x_3$，使得：

$$
x_1 + x_2 = x_3 + 1 \rightarrow x_1 + x_2 - x_3 -1 = 0
$$

## 松弛形式

通过上面的松弛变换后，我们可以得到如下形式的 PBO 问题：

$$
\begin{aligned}
\min_{x_1, \dots, x_N} &f_0(x_1, \dots, x_N) \\
s.t. \quad &g_1(x_1, \dots, x_N) = 0 \\
&g_2(x_1, \dots, x_N) = 0 \\
&\quad\vdots \\
&g_W(x_1, \dots, x_N) = 0 \\
\end{aligned}
$$

这里 $W$ 表示约束的个数

更进一步的，我们可以将约束作为函数的惩罚项，加在优化函数的后面，形式如下（此方法称为[序列无约束最小化方法](https://www.math.pku.edu.cn/teachers/lidf/docs/statcomp/html/_statcompbook/opt-cons.html#opt-cons-nonlin-penout)）：

$$
\min f = f_0(x_1, \dots, x_N) + \mu \sum^W_{w = 1}g^2_w(x_1, \dots, x_N)
$$

我们只需要保证 $\mu$ 是一个足够大的整数即可，于是，当函数有最小值时，我们可以保证惩罚项为 $0$（也就是满足约束）

而由于 $f_0$ 与后面的惩罚项 $g^2_w$ 均为多项式，于是，我们可以将其合并同类项后，写成一个类似伪布尔优化目标函数的形式：

$$
f(x_1, \dots, x_N) = \sum_{\mathcal{S}^l \in 2^{[N]}} d_l \prod_{i \in \mathcal{S}^l} x_i
$$

这里的 $d_l$ 与上文中的 $c_l$ 类似，都是项的系数

# PBO 到 Ising 模型

这一步显然是使用 [[farhiQuantumApproximateOptimization2014|QAOA]] 的关键，我们需要将目标函数写为 Ising 模型的格式，将其作为哈密顿量进行求解

## 解耦变量

这里定义了一种解耦变量，其定义为：

> [!info]
>
> 当 $x_i$ 为 $f$ 中的一个变量时，如果在所有项的系数均为 $1$ 的条件下，改变 $x_i$ 的取值只对其自身有影响，我们将其称为解耦变量
>
> 这里的有影响定义为 $f(1, \dots, x_i=1, \dots, 1) -f(1, \dots, x_i=0, \dots, 1) = 1$
> 注意，$f$ 中所有项的系数已经被设置为 $1$ 了

> [!example]-
>
> 例如 $x_1x_4 - 2x_2x_3 + 4x_1x_2x_4$ ，这里，只有 $x_3$ 为解耦变量，在这个条件下，我们可以进一步推导出：
>
> $$
> \min f(x_1, \dots, x_N) = \min f(x_1, \dots, x_i = -\frac{d_l}{2|d_l|} + \frac{1}{2}, \dots, x_N)
> $$
>
> 放在这个例子中，$\min f = x_1x_4 - 2x_2x_3 + 4x_1x_2x_4$ ，可以化为 $\min f = x_1x_4 - 2x_2 + 4x_1x_2x_4$

## 二次化

为了编码为 Ising 模型(方便量子退火进行求解)，我们需要对高次的多项式进行二次化，关于这一点，我们的做法为引入额外的辅助变量

> [!example]
>
> 例如在 $x_1x_2x_3$ 中，我们引入一个 $y_{12} = x_1x_2$，从而将这一个三次项重写为二次项，显然 $y_{12} \in \{0, 1\}$

于是，考虑原来的优化函数 $f$，我们的做法是：

1. 对于 $|\mathcal{S}^l| \geq 3$ 的项 $d_l \prod_{i \in \mathcal{S}^l} x_i$，我们选择其中两个不相同的变量 $x_i, x_j$
2. 我们引入一个新的变量 $y_{ij} = x_ix_j$ ，将此项写为 $d_l \times y_{ij} \times  \prod_{i \in \mathcal{S}^l-\{i, j\}} x_i$
3. 于是，对于新的优化函数，我们将其写为 $f^{\prime} = f + \lambda_{ij}(x_ix_j - 2x_iy_{ij}-2x_jy_{ij}+3y_{ij})$，也就是再新增一条等式约束的平方，与前面类似的，这里的 $\lambda_{ij}$ 也是一个非常大的整数

于是，重复迭代这个过程，我们就可以得到一个完全由二次项构成的优化函数 $\hat{f}$ （虽然会引入非常多的新变量）

## Ising 模型

现在我们拿到的函数为 $\hat{f}(x_1, \dots, x_N, y_1 \dots, y_M) = \sum_{\mathcal{S}^l \in 2^{[N + M]}} a_l \prod_{i \in \mathcal{S}^l}v_i$ ，这里的 $v_i$ 指代 $x_i$ 或 $y_i$，并且 $|\mathcal{S}^l| = 2$

> [!quote]
>
> Ising 模型 是一种用于描述磁性材料中自旋相互作用的经典统计力学模型。它最初是为了研究铁磁性材料的相变现象而提出的。其核心思想是：
>
> - 系统由一组**自旋**（spins）组成，每个自旋可以取两个值：+1+1（向上）或  −1−1（向下）。
> - 自旋之间通过**相互作用**（interaction）相互影响，通常是**二次相互作用**，即每个自旋只与其相邻的自旋有相互作用。
> - 系统的能量（哈密顿量）由自旋的排列和相互作用决定。
>
> Ising 模型的哈密顿量（能量函数）可以表示为：
>
> $$
> H(s) = -\sum_{i <j}J_{ij}s_is_j - \sum_ih_is_i​
> $$
>
> 其中：
>
> - $s_i \in \{-1, 1\}$  是第  $i$  个自旋的值。
> - $J_{ij}$​  是自旋  $j$  和自旋  $j$  之间的相互作用强度（通常是二阶相互作用）。
> - $h_i$ 是外部磁场对自旋  $i$  的影响。

这里，我们的问题就转化为，如何把 $\hat{f}$ 转化为 $H$ 的形式

我们考虑引入一组新的变量 $z$，并构建一个新的映射 $\phi$，其中 $\phi(x) = \phi(y) = \frac{1}{2}(1- z)$，于是，对于 $\hat{f} (x_1, \dots, x_N, y_1, \dots, y_M)$，我们有：

$$
\hat{f} (x_1, \dots, x_N, y_1, \dots, y_M) \xrightarrow{\phi} \hat{f}(z_1, \dots, z_{N+M})
$$

这里的 $z_i \in \{-1, 1\}$

然而，由于 $\hat{f} (x_1, \dots, x_N, y_1, \dots, y_M)$ 为一个二次项函数， $\hat{f}(z_1, \dots, z_{N+M})$ 也必然是二次的，我们将其展开，即可写为如下形式（我们可以不用关注常数项，因为这不影响我们的优化目标）：

$$
v(z_1, \dots, z_{N+M}) = \sum_{1 \leq i \lt j \leq N+M} w_{ij}z_iz_j + \sum_{1\leq k \leq N+M}w_kz_k
$$

> [!note]
>
> 到这一步，其实已经可以直接使用 [[farhiQuantumApproximateOptimization2014|QAOA]] 进行求解了，但论文在这个基础上，还进行了一次化简

### 化简 Ising 模型

在 $v(\mathbf{z})$ 中，如果有一些变量只存在于一个二次项中，因此我们认为这些变量存在唯一依赖关系，即：当确定了其他变量的值以最小化目标时，可以确定这些变量的值。

换而言之，这类变量的决策与否，对最小化目标函数并没有实质的贡献，因此我们可以延迟决策这些变量。

> [!example]-
>
> 考虑 $v(z_1, \dots, z_5) = z_1z_2 + z_2z_3 + z_3z_1 + z_3z_4 + z_4z_5 + z_2$， 显然 $z_5$ 存在唯一依赖关系，在延迟决策 $z_5$ 后，我们发现 $z_4$ 也成为了唯一依赖关系
> 于是，我们的做法是，将 $z_4, z_5$ 从优化函数中去除：$\min v(z_1, \dots, z_5) = \min \tilde{v}(z_1, \dots, z_3)$，且 $z_4 = \arg\min z_3z_4, z_5 = \arg\min z_4z_5$

删除这类变量后，我们可以简化 Ising 模型，最终，我们将函数表示为：

$$
\min \tilde{v}(z_{q1}, \dots, z_{qD}) = \sum_{1 \leq i \lt j \leq D}w_{ij}z_{qi}z_{qj} + \sum_{1 \leq k \leq D}w_kz_{qk}
$$

# QAOA 算法

得到了 $\tilde{v}$ 的表示后，我们可以很轻松的将其转变为哈密顿量 $H$：

$$
H = \sum_{1 \leq i \lt j \leq D}w_{ij}\sigma^z_{qi}\sigma^z_{qj} + \sum_{1 \leq k \leq D}w_k\sigma^z_{qk}
$$

这里的 $\sigma^z_{q_i}$ 表示 $z_{qi}$ 的矩阵形式（量子比特）：

$$
\sigma^z_{qi} = I_1 \otimes \dots \otimes I_{i-1} \otimes \sigma^z \otimes I_{i+1} \otimes \dots \otimes I_D
$$

这里的 $\sigma^z = \begin{bmatrix} 1 & 0\\ 0 & -1 \end{bmatrix}$ , $I_l = \begin{bmatrix} 1 & 0\\ 0 & 1 \end{bmatrix}$ （$\sigma^z$ 本质上是一个泡利 Z 门，作用效果是绕 Bloch 球  Z  轴旋转角度$\pi$）
