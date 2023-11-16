---
title: "Machine learning for combinatorial optimization: A methodological tour d’horizon"
author: Yoshua Bengio, Andrea Lodi, Antoine Prouvost
date: 2023-11-14 17:08:19
layout: Slide
---
<!--more-->

@slidestart

# A methodological tour of ML4CO

Read this paper [here](https://arxiv.org/pdf/1811.06128.pdf) , if you want to read the pub version, then click [here](https://pdf.sciencedirectassets.com/271700/1-s2.0-S0377221720X00245/1-s2.0-S0377221720306895/main.pdf?X-Amz-Security-Token=IQoJb3JpZ2luX2VjEBEaCXVzLWVhc3QtMSJHMEUCIQCHyPWcQnjAaqGGQjjlvVPHLbXtyPhM01WNjMpTIHkVLgIgc0HM9ugmex1CwNUW%2FPJmNQ4doc1hQyfSh9GWjT%2FCpeoqsgUIWhAFGgwwNTkwMDM1NDY4NjUiDKeiaOIwfhqNeqfWLyqPBRqd20a5VVXIMhnD6UYz0%2FMcG20CYURDUtfXvHrJp8%2BXcrFDcUvWeLE%2FnQuf2Rf09QEAXns6E7ArpW3Zzxiav%2BXXeAguZlRhSClaIPkCTPT45LfxJDPVlrCkWNNSdEMASD%2FF0h3hwPK0IvVOAv9NpPllwyioTGYjSmDXmpJTo7jwKmOWSukw80rRZyqQu9uUtVn83jqNXV4e1fUVwJqHnjyHJrnms1kIjrZWCvMczOGLGOJBsZoaOkEr1%2Bfg5lhNLjIcMj4xPqDBpTpCMISpV8Z0DJ5BhBbxgLI%2FtFuVISPsDZF6hj1M3TKmw0lOeHOfY6IGk5UzRbkRp2IZANibyibRrb1KaLW2NUB%2BjAxd9QjvHEp%2FBsoHY48eAbH0q%2BaYhHM6k%2FiSv97zFZ4ram5FNZXwOjPL%2BJ%2BS3RrKyHXoKKrUJrpKkx86fYhHMJzGLcWEi6Y7jrrhOYPF%2BIQLFXbnA%2BdRJnw0%2F2AGzcWw%2Fda72WXdP3TC5Q%2BXH3pL%2FaNrFiRWaN02o1Jn6nH7PLxLXbo2ajXqBqIvglxpQRLaFghmveOGBBiCV5CfC6OKVRfHc%2BNwIXFV05bl1y64xZFvvLdZjM5xtflgL86StMWmLtAOi4z9w%2F0syNWkz2HWTwS1Mdxeh1nY1o7%2Bw0qE4qZ%2FdTqTSv7C%2FoVoS2Qyx%2Fo4LWTsCp6b9AFrP941%2F1Deb%2BFtCqxr2P8G2I7ZaqHJqXICMBlbvD8BjMjOuFFEDwzgtf25xalkzVgR9iDicHgFfZULdh8D6XhtVl0VXcEhaIRiF9eGNNBjSgvUvAPZm4PmpY%2Fa400Jab1f1ikVs%2BodyvTrAvA4xdpBQx%2BnywEJCu3EdvzbSW5sOv9Ir%2Fe0dvzgy6LYzbcwgePMqgY6sQE2wgNX83gYFjZVdaOR%2Fy07BhXAizNl6hgmin3dBR47DirPkThNyIB%2BJlnbqVCU3TgA84M5eSbCBrDRuV0LXHRFPg1XTYfxTi038xSZ0%2BLiKEwREOcMEhTIeWMkDb5A%2B%2BsIDxaCji9SVDQM1FuPoxGnvkowfs4Z%2F5OeRfqr0FDm5xZ%2BkDeuimGJGF27CKJcRjWJ4YVyDHRGn9dpqwVZIcCGH3j%2BCH4Y%2FDafdkXQ9T2z3XA%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20231114T092226Z&X-Amz-SignedHeaders=host&X-Amz-Expires=299&X-Amz-Credential=ASIAQ3PHCVTY3IHGNSI5%2F20231114%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Signature=133f17555312eb5ce5c0b8fe55c14033bac6d4cca0197ad2b93b338a43f7520d&hash=0711ba4e33a3b92a618807e46f7543b8de743863b804971c57c1961c5cd308a9&host=68042c943591013ac2b2430a89b270f6af2c76d8dfd086a07176afe7c76c2c61&pii=S0377221720306895&tid=spdf-b31f8790-b8c7-4d8f-8f08-00b4e7916294&sid=c0f39b4e6a8a244887787b58e2a113a66dd0gxrqa&type=client&tsoh=d3d3LnNjaWVuY2VkaXJlY3QuY29t&ua=190b5757570a50550557&rr=825e30a2ad420792&cc=cn) .

---

## Motivation

从组合优化的角度来看，机器学习可以从两方面辅助求解：

--

假设优化算法存在专家知识/理论/经验 (i.e. expert knowledge/theoretical/empirical)，我们期望能有一个快速近似(fast approximation)来替代繁重计算。

**近似期望**
<!-- .element: class="fragment fade-in" -->

期望通过机器学习得到这个近似算法，这样我们每次决策时只需要做一次快速推理即可。
<!-- .element: class="fragment fade-in" -->

--

专家知识（经验）可能不足，或者算法做出的某些决策不够好

**最优化期望**
<!-- .element: class="fragment fade-in" -->

我们期望对解空间进行探索，学出最优解所具有的表现，从而改进现有算法的决策过程。
<!-- .element: class="fragment fade-in" -->

---

## How to learn

我们考虑如下马尔可夫决策过程

![2023-11-14-224859_screenshot](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/2023-11-14-224859_screenshot.png)
<!-- .element: class="r-stretch" -->

我们关心优化算法每次做出的决策，也就是 $\pi$ 函数，这个函数是我们期望通过 ML 来学习的，在后面我们将其称之为 `policy`。

---

#### Method 1

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311151642411.png)

通常使用模仿学习 （`imitation learning`）来学习如何做 `policy`。

基于专家知识，我们存在一个先验决策，显然，我们所需要学到的 `policy` 应该与先验决策相距甚少。

--

在这种方式下，我们通过专家模型的示范来训练一个决策函数模型，考虑下面这个例子：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311161222637.png)
<!-- .element: class="r-stretch" -->

显然，选择 “正确的” 分支可以极大地改变解空间树的大小，从而改变求解时间。

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311151642411.png)
<!-- .element: class="r-stretch" -->

我们可以认为，通过演示来学习 `policy` 本质上监督学习相同，其中（`State`，`Action`）由专家提供。
在最简单的情况下，模型预先收集专家决策，做离线训练，但更先进的方法可以在线收集这个二元组，以提高稳定性。

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311151642411.png)
<!-- .element: class="r-stretch" -->

显然，这种方法学出来的决策模型，本质上是一个运算更快的近似专家模型。

这意味着只有在计算策略的速度明显快于专家的情况下才应仅使用模仿。

---

#### Method 2

![2023-11-15-110758_screenshot](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/2023-11-15-110758_screenshot.png)

不存在专家指导，所有的决策都是通过自身的经验给出的，本质上更像强化学习。

---

## Algorithmic structure

我们已经阐述了机器学习内部的两种学习策略，在这里，我们考虑如何将 `policy` 与传统的优化算法融合，具体而言，我们有如下三种范式：

1. 端到端的学习（`End2End Learning`）
2. 学习辅助信息（`Learning to configure algorithms`）
3. `Machine learning alongside optimization algorithms`

---

### End to End

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311151801474.png)

对于端到端的学习，我们可以通过此图来表示

这个框架是 trivial 的，通过一个 ML 模型直接获得问题的解。

--

例如欧式空间的 `TSP`，我们通过 `Pointer Network` 来解决：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311161428604.png)
<!-- .element: class="r-stretch" -->

--

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311161430865.png)
<!-- .element: class="r-stretch" -->

循环网络 `n` 次，就可以得到一个城市的排列  $\pi$ ，从而获得一个解

---

### Learning to configure algorithms

在许多情况下，仅仅使用机器学习来解决问题可能不是最合适的方法。

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311161438149.png)
<!-- .element: class="r-stretch" -->

相反，可以将机器学习应用于为 `CO` 算法提供额外的信息,从而提升整体的性能。

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311161438149.png)
<!-- .element: class="r-stretch" -->

解决组合优化的传统方法中比较经典的就是建模成混合整数规划问题，在精确求解器如Gurobi、SCIP等中，规划算法的实现涉及到大量超参数。

如开源MIP求解器中性能最为强劲的SCIP求解器提供了2617个超参数，其中超过2000个超参数与求解过程中的决策强相关。通常，这些超参数由求解器开发者依据人工经验整定，面向通用问题提供一套适用性最为广泛的参数作为默认值。

--

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311161450855.png)
<!-- .element: class="r-stretch" -->

还有一种做法，我们在第三步这里，在 `offline` 的条件下训练了一个机器学习模型，我们期望其给出一个算法 $a$，将其运用到传统的 `OC` 中。

一个常见的应用为 `hyper-heuristic`，也就是通过学习和自适应的方式来生成和选择适用于不同问题的启发式算法。

---

### Machine learning alongside optimization algorithms

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311161458847.png)
<!-- .element: class="r-stretch" -->

这种结构分为两个 `level`，`high level` 为一个 `CO` 算法，`low-level` 为 ML 驱动的决策模型。

在求解的过程中，`high-level` 频繁地调用 `low-level` 进行决策，并返回一个回馈（feedback/reward/etc.)

--

<!-- .slide: data-auto-animate -->

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311161458847.png)
<!-- .element: class="r-stretch" -->

这种方法与前一节讨论的范式区别在于，`CO` 算法每次都会使用相同的 ML 模型，但会按照算法的迭代顺序调用，换而言之，ML 做出的决策是一个 online 的决策。

但在很多情况下（例如选择决策参数），两类范式是 overlap 的。

--

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202311161512184.png)
<!-- .element: class="r-stretch" -->

这里构建了一个 ML 模型，用于预测是否运行给定的启发式算法会产生比目前找到的解更好的解，并且在模型的结果为正时，贪心地运行该启发式算法。

---

## Challenges

1. Feasibility
2. Scaling

--

#### Feasibility

在端到端的范式中，指出了如何使用机器学习直接输出优化问题的解。

与其说是在学习解，不如说其正在学习启发式算法。

正如已经反复提到的，ML 在最优性方面没有给出任何保证，但更关键的是，可行性也没有得到保证。

事实上，我们不知道启发式的输出与最优解的差距有多大，或者它是否满足问题的约束。

--

#### Scaling

如果在最大 50 个节点的旅行商问题上训练的 ML 模型，在更大的实例，如规模为 100、500 个节点上进行评估，则存在泛化方面的挑战。

为了解决这个问题，人们可能会尝试在更大的实例上学习，但这可能会变成一个计算和泛化问题。

---

## Question

1. 提出的第三个范式由于可以解耦，因此其 ML 通常为 offline 模型训练，但如果需要 online 的方式来训练这个模型，我们如何找到合适的集合？

@slideend

