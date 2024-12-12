---
title: Distributed QAOA for PBO Problem
description: 
tags:
  - Reading
date: 2024-12-12
lastmod: 2024-12-12
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
> 1.  将 PBO 问题编码为 QAOA 的形式
> 2. 将 QAOA 分割为子问题进行分布式求解
>  
# Local to Global: A Distributed Quantum Approximate Optimization Algorithm for Pseudo-Boolean Optimization Problems

> [!summary] 
> 
> With the rapid advancement of quantum computing, Quantum Approximate Optimization Algorithm (QAOA) is considered as a promising candidate to demonstrate quantum supremacy, which exponentially solves a class of Quadratic Unconstrained Binary Optimization (QUBO) problems. However, limited qubit availability and restricted coherence time challenge QAOA to solve large-scale pseudo-Boolean problems on currently available Near-term Intermediate Scale Quantum (NISQ) devices. In this paper, we propose a distributed QAOA which can solve a general pseudo-Boolean problem by converting it to a simplified Ising model. Different from existing distributed QAOAs' assuming that local solutions are part of a global one, which is not often the case, we introduce community detection using Louvian algorithm to partition the graph where subgraphs are further compressed by community representation and merged into a higher level subgraph. Recursively and backwards, local solutions of lower level subgraphs are updated by heuristics from solutions of higher level subgraphs. Compared with existing methods, our algorithm incorporates global heuristics into local solutions such that our algorithm is proven to achieve a higher approximation ratio and outperforms across different graph configurations. Also, ablation studies validate the effectiveness of each component in our method.


$$
f_0(x_1, x_2, \dots, x_K) = \sum_{\mathcal{S}_0^l \in 2^{[K]}}c_l\prod_{i \in \mathcal{S}^l_0 }x_i
$$

其中，$K$ 表示出现在目标函数中的变量数，$$