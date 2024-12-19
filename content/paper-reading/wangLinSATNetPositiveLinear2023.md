---
title: LinSATNet 框架
description: 
tags:
  - 论文阅读
  - ML4CO
date: 2024-12-15
lastmod: 2024-12-19
draft: false
zotero-key: 5XL6F8MG
zt-attachments:
  - "938"
citekey: wangLinSATNetPositiveLinear2023
---

> [!tldr]
>
> [文章链接](https://proceedings.mlr.press/v202/wang23at.html)

# LinSATNet: The Positive Linear Satisfiability Neural Networks

> [!summary]
>
> Encoding constraints into neural networks is attractive. This paper studies how to introduce the popular positive linear satisfiability to neural networks. We propose the first differentiable satisfiability layer based on an extension of the classic Sinkhorn algorithm for jointly encoding multiple sets of marginal distributions. We further theoretically characterize the convergence property of the Sinkhorn algorithm for multiple marginals, and the underlying formulation is also derived. In contrast to the sequential decision e.g. reinforcement learning-based solvers, we showcase our technique in solving constrained (specifically satisfiability) problems by one-shot neural networks, including i) a neural routing solver learned without supervision of optimal solutions; ii) a partial graph matching network handling graphs with unmatchable outliers on both sides; iii) a predictive network for financial portfolios with continuous constraints. To our knowledge, there exists no one-shot neural solver for these scenarios when they are formulated as satisfiability problems. Source code is available at https://github.com/Thinklab-SJTU/LinSATNet.

- [ ] 🛫 2024-12-15 补全阅读笔记
