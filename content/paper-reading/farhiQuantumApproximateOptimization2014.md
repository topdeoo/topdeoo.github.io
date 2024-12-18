---
title: QAOA 算法
description: 
tags:
  - 论文阅读
  - 量子算法
date: 2024-12-12
lastmod: 2024-12-19
draft: false
zotero-key: E58SF83N
zt-attachments:
  - "722"
citekey: farhiQuantumApproximateOptimization2014
---

> [!tldr]
>
> [文章链接](http://arxiv.org/abs/1411.4028)
>
> 通过绝热定理，我们可以写出哈密顿量的一个形式：
>
> $$
> H = \sum_{i = 1}^NH_i
> $$
>
> 又根据含时哈密顿量在薛定谔方程中的解，我们可以得出 $U(H, t) = \exp{(\frac{-iHt}{\hbar})}$
>
> 根据 [Trotter-Suzuki decomposition](https://en.wikipedia.org/wiki/Lie_product_formula) $e^{A +B} \simeq (e^{\frac{A}{n}}e^{\frac{B}{n}})^n$
>
> 我们可以将系统最终演化酉变换写为：
>
> $$
> U(H, t, p) = \prod^p_{j=1}\prod_ke^{\frac{-iH_kt}{n}}, H = \sum_k H_k
> $$
>
> 而 QAOA 就是在这个基础上，让哈密顿量在基态与问题哈密顿量之间切换，通过优化时间的参数，来达到优化最终损失函数的目的

# A Quantum Approximate Optimization Algorithm

> [!abstract]-
>
> We introduce a quantum algorithm that produces approximate solutions for combinatorial optimization problems. The algorithm depends on a positive integer p and the quality of the approximation improves as p is increased. The quantum circuit that implements the algorithm consists of unitary gates whose locality is at most the locality of the objective function whose optimum is sought. The depth of the circuit grows linearly with p times (at worst) the number of constraints. If p is fixed, that is, independent of the input size, the algorithm makes use of efficient classical preprocessing. If p grows with the input size a different strategy is proposed. We study the algorithm as applied to MaxCut on regular graphs and analyze its performance on 2-regular and 3-regular graphs for fixed p. For p = 1, on 3-regular graphs the quantum algorithm always finds a cut that is at least 0.6924 times the size of the optimal cut.

# 组合优化问题的编码

任意一个组合优化问题都可以被编码为 MAX-SAT 的形式（$n$ 个变量，$m$ 条子句），并使用这 $n$ 个 0-1 变量定义一个目标函数：

$$
C(z) = \sum^m_{\alpha=1}C_{\alpha}(z)
$$

其中，$z = z_1z_2\dots z_n$，为一个比特串，$C_{\alpha}(z)$ 表示第 $\alpha$ 条子句是否满足

对于一个量子计算机，其运行在一个 $2^n$ 维的希尔伯特空间内，我们需要求得的比特串为 $\ket{z}$，使得 $C(z)$ 最大

我们通过 [[Quantum Algorithm Preparation#量子计算原理|量子计算原理]] 中的内容，将目标改写为通过构造一个参数 $\theta$，使我们能够求得哈密顿量的基态 $\ket{z}$，也就是使得损失函数最小的量子态

在介绍如何构造哈密顿量之前，我们引入一个理论基础

# 绝热量子计算

> [!quote]
>
> 绝热定理
>
> 对于一个含时但演化足够慢($T \to \infty$)的物理系统，若系统的初始时刻处于一能量本征态 $\ket{\psi(0)}$，那么在 $t$ 时刻将处于 $H(t)$ 相应的瞬时本征态 $\ket{\psi(t)}$ 上

那么，我们构建一个 [[Quantum Algorithm Preparation#状态的演化|含时的哈密顿量演化过程]] $H_B \rightarrow H_P$ 如下，其中 $H_B = - \sum_i \sigma^x_i$，其对应的本征态为 $\ket{\psi_0} = \prod_i \ket{+}$，注意这里的 $\prod_i \ket{+}$ 表示张量积 $\ket{+} \otimes \ket{+} \dots$

$$
\hat{H}(t) = (1 - s(t))H_B + s(t)H_P
$$

其中，$s(0) = 1, s(T) = 1$

> [!tldr]-
>
> 通过薛定谔方程，我们可以直接求得
>
> $$
> \begin{aligned}
> \ket{\psi} &= \mathcal{T}\exp{(\frac{-i}{\hbar}\int^{t}_{0}\hat{H}(t)dt)\ket{\psi_0}}\\
> &= U(t)\ket{\psi_0}
> \end{aligned}
> $$

我们期望演化足够缓慢，于是 $T \to \infty$ ，换而言之，我们对 $[0, 1]$ 这个区间进行细分，得到：

$$
\hat{H}(t) = \prod_j^p \bigg((1 - s(j\Delta t))H_B + s(j\Delta t)H_P \bigg)\Delta t
$$

本质上，我们相当于演化了 $p$ 次，每次的时间为 $\Delta t$，我们可以通过以下等式求得经过 $p$ 次演化的本征态 $\ket{\psi}$ ：

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

> [!question]
>
> 乍看这种交替作用的演化并不是一条连续的演化路径（绝热定理要求是连续的，因为我们需要对其做积分），
> 甚至路径两端并不是从 $H_B \to H_P$，不符合绝热定理的要求
>
> 但实际上，这相当于在某一条连续的路径上进一步做了 Trotter 分解:

我们令 $\theta = (\overrightarrow{\gamma}, \overrightarrow{\beta})$，即可得到：

$$
\ket{\psi(\theta)} = \prod^p_{j=1}U_B^{(j)}U_C^{(j)} \ket{+}
$$

其中，$\theta = (\gamma_1, \beta_1, \dots, \gamma_p, \beta_p)$

根据 [[Quantum Algorithm Preparation#测量|量子计算理论基础]] 可以知道，我们现在就得到了一个可以使用经典优化器优化的模型：

$$
C(\theta) = \bra{\psi(\theta)}H\ket{\psi(\theta)}
$$

通过测量得到 $C(\theta)$ 后，调用传统优化器更新 $\theta$（梯度下降，牛顿法，单纯形法等），不断重复这个过程，如下图所示：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202412140041518.png)

最后，我们在基态中测量 $\ket{\psi(\theta)}$，测得概率最大的一个作为问题的解

> [!important]
>
> 根据我们之前所说，这里的酉变换 $U_i$ 本质上都是量子门，但我们期望所有量子门都通过基础的门来生成（泡利门等），于是这要求我们需要将问题的哈密顿量编码为能够写为泡利门组合的形式

# 最小顶点覆盖示例

考虑 $G = <V, E>$ 上的 MVC 问题，我们的目标是选取最少的顶点，使得所有的边均覆盖

于是，对于每个顶点，我们使用 $\ket{\psi_i}$ 这个量子比特来表示，其为 $\ket{0}, \ket{1}$ 的叠加态，那么对这个图而言，我们需要求得一个比特串 $z$，这个比特串的第 $i$ 位表示顶点 $i$ 是否被选择，那么对于整个量子系统，我们可以写出 $z$ 的表示为 $n$ 个量子比特的张量积：

$$
\ket{z} = \ket{\psi_i} \otimes \dots \otimes \ket{\psi_n}
$$

问题的哈密顿量为：

$$
H_C \ = \ 3 \sum_{(i, j) \in E(G)} (\sigma^i_z \sigma^j_z \ + \ \sigma^i_z \ + \ \sigma^j_z) \ - \

                  \displaystyle\sum_{i \in V(G)} \sigma^i_z
$$

其中 $\sigma_z \in \{-1, 1\}$

于是，我们的目的就是求得当哈密顿量最小时的基态 $\ket{z}$ 的值

考虑一个简单的图，如下所示，显然其最小顶点覆盖的解为：{2, 1}，需要求得的量子比特位 $\ket{z} = 01100$（当然也有其他解）

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202412170047570.png)

我们考虑两层的 QAOA 算法，线路如下所示：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202412170044579.png)

随后，我们使用梯度下降优化器来优化参数 $\theta = (\overrightarrow{\gamma}, \overrightarrow{\beta})$，使得 $\braket{H_C(\theta)}$ 取得最小值，我们运行 70 轮：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202412170045329.png)

最终，我们测量出现概率最高的基态：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202412170046477.png)

概率最高的也同样是 $\ket{z} = 01100$

> [!info]
>
> QAOA 中的近似，本质上是在绝热过程中的近似，因为绝热演变要求时间缓慢（也就是趋向于无穷），那么也就要求 $p \to \infty$，因此近似的 gap 有很大一部分在这里
