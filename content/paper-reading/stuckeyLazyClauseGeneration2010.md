---
title: Lazy Clause Generation
description: 
tags:
  - 论文阅读
  - 约束求解
  - SAT
date: 2024-12-17
lastmod: 2024-12-19
draft: false
zotero-key: RADMDA7D
zt-attachments:
  - "933"
citekey: stuckeyLazyClauseGeneration2010
---

> [!tldr]
>
> [文章链接](http://link.springer.com/10.1007/978-3-642-13520-0_3)

# Lazy Clause Generation: Combining the Power of SAT and CP (and MIP?) Solving

> [!summary]
>
> Finite domain propagation solving, the basis of constraint programming (CP) solvers, allows building very high-level models of problems, and using highly speciﬁc inference encapsulated in complex global constraints, as well as programming the search for solutions to take into account problem structure. Boolean satisﬁability (SAT) solving allows the construction of a graph of inferences made in order to determine and record eﬀective nogoods which prevent the searching of similar parts of the problem, as well as the determination of those variables which form a tightly connected hard part of the problem, thus allowing highly eﬀective automatic search strategies concentrating on these hard parts. Lazy clause generation is a hybrid of CP and SAT solving that combines the strengths of the two approaches. It provides state-ofthe-art solutions for a number of hard combinatorial optimization and satisfaction problems. In this invited talk we explain lazy clause generation, and explore some of the many design choices in building such a hybrid system, we also discuss how to further incorporate mixed integer programming (MIP) solving to see if we can also inherit its advantages in combinatorial optimization.

> [!todo]
>
> - [ ] ⏳ 2024-12-19 📅 2024-12-24 补全笔记
