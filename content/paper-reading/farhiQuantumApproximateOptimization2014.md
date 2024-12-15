---
title: QAOA 算法
description: 
tags:
  - 论文阅读
  - 量子算法
date: 2024-12-12
lastmod: 2024-12-15
draft: false
zotero-key: E58SF83N
zt-attachments:
  - "722"
citekey: farhiQuantumApproximateOptimization2014
---

> [!tldr]
>
> [文章链接](http://arxiv.org/abs/1411.4028)

# A Quantum Approximate Optimization Algorithm

> [!summary]-
>
> We introduce a quantum algorithm that produces approximate solutions for combinatorial optimization problems. The algorithm depends on a positive integer p and the quality of the approximation improves as p is increased. The quantum circuit that implements the algorithm consists of unitary gates whose locality is at most the locality of the objective function whose optimum is sought. The depth of the circuit grows linearly with p times (at worst) the number of constraints. If p is fixed, that is, independent of the input size, the algorithm makes use of efficient classical preprocessing. If p grows with the input size a different strategy is proposed. We study the algorithm as applied to MaxCut on regular graphs and analyze its performance on 2-regular and 3-regular graphs for fixed p. For p = 1, on 3-regular graphs the quantum algorithm always finds a cut that is at least 0.6924 times the size of the optimal cut.

# 绝热量子计算

> [!quote]
>
> 绝热定理
>
> 对于一个含时但演化足够慢($T \to \infty$)的物理系统，若系统的初始时刻处于一能量本征态 $\ket{\psi(0)}$，那么在 $t$ 时刻将处于 $H(t)$ 相应的瞬时本征态 $\ket{\psi(t)}$ 上

那么，我们构建一个含时的哈密顿量连接 $H_B \rightarrow H_P$ 如下，其中 $H_B = - \sum_i \sigma^x_i$，其对应的本征态为 $\ket{\psi_0} = \prod_i \ket{+}$

$$
\hat{H}(t) = (1 - s(t))H_B + s(t)H_P
$$

其中，$s(0) = 1, s(T) = 1$，我们期望演化足够缓慢，于是 $T \to \infty$ ，换而言之，我们对 $[0, 1]$ 这个区间进行细分，得到：

$$
\hat{H}(t) = \prod_j^p \bigg((1 - s(j\Delta t))H_B + s(j\Delta t)H_P \bigg)\Delta t
$$

本质上，我们相当于演化了 $p$ 次，每次的时间为 $\Delta t$

> [!question]
>
> 哈密顿量如何将其转化为量子电路呢？

我们可以通过以下等式求得经过 $p$ 次演化的本征态 $\ket{\psi}$ ：

$$
\ket{\psi} = \prod_i U_i\ket{\psi_0}
$$

其中 $U_i$ 是一个酉变化，根据上面提到的哈密顿量演化过程，我们可以将其写为如下形式：

$$
\ket{\psi} = \prod^p_{j=1} \exp \Bigg(-i \bigg( (1 - s(j\Delta t))H_B + s(j\Delta t)H_P \bigg)\Delta t \Bigg)\ket{\psi_0}
$$

进一步的，为了方便电路的实现，对每次的演化，我们规定如下：

$$
\begin{aligned}
s(t) = 1 &,  t \in [0, \gamma_1) \\
s(t) = 0 &, t \in [\gamma_1, \gamma_1 + \beta_1)\\
s(t) = 1 &, t \in [\gamma_1 + \beta_1, \gamma_1 + \beta_1 + \gamma_2)\\
&\vdots
\end{aligned}
$$

也就是来回演化 $H_B$ 与 $H_P$，那么我们可以写出 $\ket{\psi}$ 的表达如下：

$$
\begin{aligned}
\ket{\psi(\overrightarrow{\gamma}, \overrightarrow{\beta})} &= e^{-iH_B\beta_p}\times e^{-iH_P\gamma_p} \times \dots \times e^{-iH_B\beta_1} \times e^{-iH_P\gamma_1} \ket{+} \\
&= \prod^p_{j=1} e^{-iH_B\beta_j} e^{-iH_P\gamma_j} \ket{+} \\
&= \prod^p_{j=1}U_B^{(j)}U_C^{(j)} \ket{+}
\end{aligned}
$$

我们令 $\theta = (\overrightarrow{\gamma}, \overrightarrow{\beta})$，即可得到：

$$
\ket{\psi(\theta)} = \prod^p_{j=1}U_B^{(j)}U_C^{(j)} \ket{+}
$$

其中，$\theta = (\gamma_1, \beta_1, \dots, \gamma_p, \beta_p)$

根据 [[#构建量子电路的理论原理|上文的内容]] 可以知道，我们现在就得到了一个可以使用经典优化器优化的模型：

$$
C(\theta) = \bra{\psi(\theta)}U^\dagger(\theta) H_PU(\theta) \ket{\psi(\theta)}
$$

通过测量这个电路，得到$\ket{\psi(\theta)}$ 后，调用传统优化器更新 $\theta$（通常为梯度下降），然后进一步生成量子电路，不断重复这个过程，如下图所示：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202412140041518.png)
