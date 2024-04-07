---
date: "2023-10-07 16:22:51"
categories: 
- Slides
title: Connected power domination in graphs
---
> slide of Connected power domination in graphs

<!--more-->

@slidestart [sky]

<!-- .slide: data-transition="slide" data-auto-animate -->


# Model Details
<!-- .element class="r-fit-text" -->

- Preliminaries

- Model

---

<!-- .slide: data-transition="slide" data-auto-animate -->

# Preliminaries
<!-- .element class="r-fit-text" -->

考虑无向图 $G = <V, E>$ 对应的双向图 $\vec{G} = <V, E \times E - \{ \forall v \in V, <v, v>\} >$:

1. 如果 $v$ 是 $e$ 的起点，则记为 $e \in \delta^{-}(v)$ 
<!-- .element: class="fragment fade-in" -->

2. 如果 $v \in S$ 其中 $S$ 为 `power dominating set`，我们记为 $s_{v}= 1$，否则记为 $s_{v} = 0$
<!-- .element: class="fragment fade-in" -->

3. $T$ 表示最多经过多少步后，图完全被传播（注意 $|V|$ 步后所有顶点一定都被 `observed`了）
<!-- .element: class="fragment fade-in" -->

4. $x_{v}\in \{0, 1, 2, \dots, T\}$ 表示对 $v \in V$ 其经过 $x_v$ 步后变为 `observed` 的
<!-- .element: class="fragment fade-in" -->

5. 对于 $e = <u, v> \in E$，若 $u$ 支配着 $v$ ，或 $v$ 是由 $u$ 传播到的，那么我们记为 $y_{e}= 1$ 否则记为 $y_{e}= 0$
<!-- .element: class="fragment fade-in" -->

---

<!-- .slide: data-transition="slide" data-auto-animate -->


# Model for pds
<!-- .element class="r-fit-text" -->

$$
min \sum_{v \in V} s_{v} 
$$
subject to
$$
\forall v \in V, \, s_{v}+ \sum\limits_{e \in \delta^{-}(v) }y_{e}= 1
$$
$$ 
\forall e = (u, v), \, x_{u} - x_{v}+ (T + 1)y_{e} \leq T
$$
$$
\forall e = (u, v), \forall w \in N(u) - \{v\}\,\,\,\, x_{w}- x_{v} + (T + 1)y_{e}\leq T + (T+1)s_{u}
$$
$$
x \in \{0, 1, 2, \dots , T\}^{n}\,\, y\in \{0, 1\}^{m}\,\, s\in \{0, 1\}^{n}
$$

---
# Way to solve cpds

apply [MTZ constraints](https://mister-hope.com) to Model above 

其按照这篇 [paper](https://dl.acm.org/doi/abs/10.1016/j.dam.2009.01.017) 中提出的方法使用了这些约束的实现，但在论文中没有给出新的模型及其约束

@slideend
