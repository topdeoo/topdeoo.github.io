---
title: Efficient Algorithm for Power Dominating Set Problem
date: 2023-09-26 16:22:51
layout: Slide
---

@slidestart [sky]

<!-- .slide: data-transition="slide" data-auto-animate -->


# Introduction
<!-- .element class="r-fit-text" -->

- Preliminaries

- Reduction Rules

---

<!-- .slide: data-transition="slide" data-auto-animate -->

# Preliminaries
<!-- .element class="r-fit-text" -->

考虑图 $G = <V, E>$：

1. 集合 $Y$ 表示被排除的顶点集合(i.e. exclude set)
<!-- .element: class="fragment fade-in" -->

2. 称 $X \subseteq V$ 为预选集合(i.e. pre-selected set)
<!-- .element: class="fragment fade-in" -->

3. 顶点 $v \in V-X-Y$ 被称为未判定的(i.e. undecided set)
<!-- .element: class="fragment fade-in" -->

4. 集合 $Z \subseteq V$ 表示未被传播的顶点集合(i.e. non-propagating set)
<!-- .element: class="fragment fade-in" -->

5. 集合 $B = V - Y$ 表示允许存在于解集中的顶点集合
<!-- .element: class="fragment fade-in" -->

---

<!-- .slide: data-transition="slide" data-auto-animate -->


# Reduction Rules
<!-- .element class="r-fit-text" -->

- Local Rules
	- Deg1a
	- Deg1b
	- Tri
	- Deg2a
	- Deg2b
	- Deg2c
	- OnlyN
	- ObsNP
	- ObsE
	- Isol


- Non-local Rules
	- Dom
	- NecN


---

<!-- .slide: data-transition="slide" data-auto-animate -->

# Notation
<!-- .element: class="r-fit-text" -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230929095152.png)
<!-- .element: class="r-stretch" -->

---

<!-- .slide: data-transition="slide" data-auto-animate -->

# Deg1a

若 $v$ 是一个未判定的叶子节点，并且其连接在一个未排除的顶点 $w$ 上，我们将 $v$ 排除

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230929095118.png)

<!-- .element: class="r-stretch" -->

---

<!-- .slide: data-transition="slide" data-auto-animate -->
# Deg1b

假定 $v$ 是一个与 $w$ 相连的叶子节点且被排除。如果 $w$ 是被传播的，那么我们可以删除 $v$ 并将 $w$ 设置为非传播的，而如果 $w$ 未被排除且未被传播，我们可以删除 $v$ 并预选 $w$

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230929095435.png)


<!-- .element: class="r-stretch" -->

@slideend
