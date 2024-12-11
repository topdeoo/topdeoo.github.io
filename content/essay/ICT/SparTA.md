---
title: SparTA 解读
description: 
tags:
  - MLSys
  - Compiler
date: 2023-06-16
lastmod: 2024-12-11
draft: false
---

> `SparTA` 解读（[论文](https://www.usenix.org/system/files/osdi22-zheng-ningxin.pdf)、[源码](https://github.com/microsoft/SparTA) 与 [复现](https://github.com/microsoft/nni/tree/sparta_artifact/sparta) ）

# `Introduction`

明确论文发表的时间为 2022 年，在这个时间段，算力的提升使得 `DNN` 的层数能够越来越深，模型越来越复杂。此时，为了提高 `DNN` 效率而必须进行稀疏化，也就是尽可能地减少不必要的数据冗余。

具体原因如下：

> [!quote]
> 
> 对深度神经网络（`DNN`）进行稀疏化是为了减少模型的大小、加速模型的推理速度和降低模型的能耗。
>
> 具体来说，稀疏化可以通过去除网络中的一些不必要的神经元或连接，从而减少网络的参数数量和计算复杂度，以实现网络的轻量化和加速。通过稀疏化，可以使得模型在相同的精度下具有更小的体积和更快的推理速度，这对于一些资源受限或对实时性要求较高的应用非常有用。
>
> 此外，稀疏化还可以降低模型的能耗，因为稀疏模型中的大部分计算可以被跳过，从而降低了模型的功耗和热量产生。这对于一些移动设备和嵌入式系统非常重要，因为这些设备通常具有有限的电池寿命和散热能力。
>
> 对 `DNN` 进行稀疏化可以在不损失精度的情况下，降低模型的大小、加速模型的推理速度和降低模型的能耗，从而可以满足一些资源受限或对实时性要求较高的应用需求。

常见的稀疏化方法包括量化和剪枝：

- 量化是将模型中的某些权重转换为更低精度的值 (例如把 16 位浮点树变为 8 位整型)
- 剪枝则是将模型中的某些权重设置为 0 以减小模型的大小。

这些方法可以有效地减少模型的大小，同时保持模型的精度。

在这篇文章中，作者期望通过一个新的抽象，即`Tensor-with-Sparsity-Attribute`（`TeSA`），来实现模型的稀疏性，它增强了默认的 `Tensor` 抽象，该抽象基本上是为密集模型设计的。`TeSA` 使稀疏属性和模式（例如，用于剪枝和量化）能够被指定，在整个深度学习模型中向前和向后传播，并用于创建高效的专门运算符，同时考虑到不同稀疏模式在不同（稀疏感知）硬件上的执行效率。由此产生的 `SparTA` 框架可以适应各种稀疏模式和优化技术，与 $7$ 个最先进的稀疏解决方案相比，在推理延迟上提供了`1.7`倍 ∼`8.4`倍的平均速度，而且内存占用更小。作为一个端到端的模型稀疏性框架，`SparTA`促进了稀疏性算法探索更好的稀疏模型。

# `Motivation`

在 `Intorduction` 中提到为什么需要进行稀疏化，也简单阐述了常见的稀疏化方法；然而，虽然我们已经能够对 `DNN` 稀疏化了，但 `DNN` 系统目前尚未能够有效地利用稀疏性，换而言之就是其运算速度不够快，并且优化的也不够好。原因如下：

1. 用于处理稀疏性的常见计算库 (如 `CUDA` 库) 的性能仍然不够好。例如，`cuSPARSE` 库已经被证明即使在处理稀疏度高达 $98\%$ 的稀疏矩阵时都比 `cuBLAS` 库慢得多。
2. 由于 `DNN` 的层数均较深，稀疏性模式可能会在模型的不同层发生变化，难以实现端到端的提升。
3. 针对稀疏性的优化涉及从深度学习框架、编译器、优化器、`operator` 和 `kernel`，一直到硬件的垂直修改，任一层次支持不足都可能导致效率低下。
4. 性能的评估较为困难，稀疏性创新要么被限制在单个算子上，用代理指标进行评估，而不知道端到端的效果，要么必须在少数神经模型上手动实现，难以移植到其他模型上。更有问题的是，特定的解决方案很难被扩展到或与其他优化相结合。

论文对这些问题进行了阐述，并期望提出的 `SparTA` 能够解决上述的问题。

# 系统架构

​ 系统整体的架构如下：

![image-20230608004439521](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230608004439521.png)

`SparTA` 的核心是 `TeSA` 抽象，它用稀疏属性扩充了现有的张量抽象。

算法设计者可以将深度学习模型所选张量中的稀疏模式指定为 **初始张量稀疏属性**。

> 注意这里的初始化，实际上的做法是：
>
> 1. 从所有权值张量的集合 $W_i, i \in \{1, 2, ..., n\}$ 中选择一个子集 $W_j, j \in \{1, 2, ...,n\}$
> 2. 为子集中的张量初始化 `TeSA` 属性

随后，`SparTA` 根据传播规则进行属性传播，推断深度学习模型中所有其他张量的稀疏度属性。稀疏属性传播比原始稀疏张量暴露出更多的优化机会。

> 在下图中说明了一个属性传播的例子，矩阵 $W_2$ 展示了一个细粒度的稀疏性模式 (63% 的稀疏性)。这种初始稀疏性模式会对 $W_2$ 的下游和上游矩阵产生影响，例如 $W_1, T_2, T_3, T_4, T_5$ 和 $W_5$。
>
> 注意到传播是以算子为单位的，例如这里的第二个 `MatMul` 算子，其执行的运算为 $T3 = W_2 \times T_2$
>
> - 考虑到 $W_2$ 的第二列被修剪（也就是说其值为 $0$ ），于是 $T_3$ 的第二列注定要为零，因此也可以被修剪。
> - 同样由于 $W_2$ 的第三行被修剪，因此 $T_2$ 的第三列也可以被修剪。
>
> ![image-20230608002612609](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230608002612609.png)
>
> 而注意到这里 $W_2$ 可以认为是选择被初始化的张量，所以在 $W_2$ 中可以存在不规则的剪枝（也就是说可以不是一整行或一整列），而被传播这种属性的张量（$T_2$ ， $T_3$ ），其被认为需要剪枝的元素是规则的（都是一整行或一整列）

属性传播后，`SparTA` 运行多遍 `pass` ，生成高效的端到端代码。在传统的 `DNN` 编译器基础上， `SparTA` 这里新增了两个额外的 `pass`，以充分利用模型的稀疏特性：

1. 将具有复杂稀疏模式的张量转换为简单稀疏模式，并提供一些 `hints` 用于之后阶段的代码生成
2. 利用转化后的结果，为 `operator` 生成代码

最后，通过最终编译的代码，模型设计者可以对 `DNN` 模型进行剖析，以获得真实的性能指标，包括内存消耗和推理延迟。在给定反馈的情况下，模型设计者可以进一步更新某些张量中的稀疏性属性，并迭代重复这一过程，以找到最佳折衷。

因此，`SparTA` 实现了反馈循环，促进了模型稀疏性的创新。

# `TeSA` 抽象

在上文中提到，`SparTA` 的核心部分，就是提出了 `TeSA` 抽象，因此整体的架构均围绕着 `TeSA` 展开，这里对 `TeSA` 进行详细的介绍。

`TeSA` 是在传统张量的基础上增加一个形状相同的附加张量，其中每个元素都是一个标量值，表示原始张量中对应元素的稀疏属性，这使得用户可以在一个张量中指定任意的稀疏性模式。

下图展示了 `TeSA` 的一个实例。左边显示了原始的稠密张量。右边表示对应的稀疏度属性，其中一个修剪张量中的第二行，用 8 位量化右下角元素，其余元素用 4 位量化。于是，`TeSA` 可以将张量量化和剪枝统一在一个抽象中。统一的抽象便于剪枝和量化的协同优化，例如，选择合适的块大小来覆盖(表示)剩余的(非剪枝的)元素，同时与低比特硬件指令对齐。

![image-20230608120915335](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230608120915335.png)

通过 `TeSA`，`SparTA` 可以理解编译时的稀疏模式，从而进行进一步的优化。

虽然这里为每一个参数引入了一个新的矩阵 `Attr`，增大了内存的消耗，但这只是编译阶段而已，在部署后的实际计算阶段并不会带来额外的资源负担。

# 稀疏属性传播

在之前提到，用户不会为所有权值张量 $W_i$ 都设置 `TeSA` ，这是因为：

1. `TeSA` 在上文中已展示过，是通过用户自定义的，一个拥有几亿参数的 `DNN` 实在无法做到为每个参数都进行自定义设置
2. `TeSA` 的设置实际上相当于 `DNN` 的内存扩大了接近一倍（若为所有张量都设置的 `TeSA` 的话），显然是不可接受的

因此，我们期望一个自动化的方法，让我们通过设定某几个权值张量的稀疏特征， 然后进行传播，使得 `DNN` 中的所有张量都有 `TeSA` 属性

> 注意，直到传播完成后，**所有张量** 才有了稀疏属性矩阵（即 `TeSA` ）

`SparTA` 用稀疏性属性传播从部分张量的 `TeSA`，沿着 `DNN` 的 `DFG` 推导其他张量的 `TeSA`，在传播过程中，模型的稀疏性随更新不断增加直至收敛，量化模式也将收敛到最少的量化位，算法如下图所示：

![image-20230608122849520](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230608122849520.png)

给定一个节点，如果某个节点的任意输入或输出张量的 `TeSA` 被更新，那么 `PropOneNode` 按照一定的传播规则，更新与该节点相关的其他张量的 `TeSA`。重复传播，直到没有 `TeSA` 需要进一步更新，相当于做一次 `bfs`

> Q：如何保证算法是**收敛**的，换而言之，如何保证最终的 `S` 一定会为空
>
> A：算法可以结束的证明如下
>
> 1. 多次剪枝更新导致所有更新中被剪枝元素的并集
> 2. 对于量化，属性将收敛到最少的量化比特（若为 0 ，则可视为剪枝）
>
> 由于每次传播都单调增加稀疏度，并且剪枝和量化的传播都是交换和关联的，因此算法保证是有穷的。

## 传播规则

从 [系统架构](#系统架构) 中可以发现，我们还需要传播规则对如何传播作出约束，而传播规则由两部分组成：

1. 剪枝规则
2. 量化规则

### 剪枝规则

在先前的注释中提到，传播可以对上下游都进行影响，以下图为例：

![image-20230608153906121](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230608153906121.png)

张量 $W_3$ 中的剪枝后的元素 $[0,0]$ 不能通过算子$Matmul$ 传播到 $W_1$ 和 $W_2$，但如果该算子是像 $ReLU$ 这样的元素级计算，它确实可以传播到上游张量。

传播也可以是双向的。上图的 `a` 中表明输入 $W_2$ 可以影响输出 $W_3$ 和另一个输入 $W_1$。而在 `b` 中，输入 $W_2$ 会由于输出 $W_3$ 的 `TeSA` 而变得稀疏

在这里，我们有两种方法来定义剪枝规则：

1. `TeSA` 代数

   剪枝属性的传播依赖于算子的计算逻辑。为了捕捉这种性质，`SparTA` 定义了一个 `TeSA` 代数，它将一个算子的元素计算映射到一个包含两个元素的集合$S = \{pruned, unpruned\}$。`TeSA` 代数如下表所示。给定一个输入 `TeSA`，其输出 `TeSA` 可以使用 `TeSA` 代数计算，遵循算子的相同计算流程。并且表中也可以添加自定义的规则

   ![image-20230608155431855](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230608155431855.png)

   在这里，$\alpha, \phi$ 分别代表了未剪枝的与已剪枝的元素

2. `Tensor Scrambling`

这是一种处理黑盒或复杂算子的概率传播规则。该规则通过对其他相关张量的值进行置乱，得到张量的剪枝元素。具体做法为，该规则将输入张量中被剪枝的元素置零，并为剩余元素分配随机值，然后运行该算子得到其输出张量。通过重复这个过程足够多次，该规则将那些始终保持为零的元素视为输出张量中的剪枝元素。

当然，上面的规则也只是输入到输出的传播，这都是显然的，我们着重需要考虑的是输出到输入的传播，输入到输入的传播。为了讨论这个部分，我们举如下例子：

假设 $Y = AX + B$ ，其中 $Y$ 是输出张量，$A，B$ 和 $X$ 是输入张量。

为了得到 $A，B，X$ 的 `TeSA`，我们分别对 $A，B，X$ 求导，即 $gA = gY × X^T$，$gB = gY$，$gX = A^T × gY$

输出张量 $Y$ 到输入张量 $A$ 的稀疏传播采用$gA = gY × X^T$，$gY$ 与 $Y$ 具有相同的 `TeSA`

给定 $Y$ 和 $X$ 的 `TeSA`，$gA$ 的 `TeSA` 可以通过 `TeSA` 代数或 `Tensor Scrambling` 来推断。

从 $X$ 到 $A$ 的传播也使用这种反向计算，即输入到输入的传播。类似地，利用 $gB = gY$ 和 $gX = A^T × gY$ 可以分别从 $Y$ 中推断 $B$ 和 $X$ 的 `TeSA`。由 $gB = gY$ 可知，$B$ 与 $Y$ 具有相同的`TeSA`。

> 所谓相同的 `TeSA`，我个人的倾向是表现 **稀疏特征** 的那个矩阵是相同的，表示权值的矩阵是不同的

### 量化规则

对于量化属性的传播，关键是找到不必要的高量化精度的张量。`SparTA` 定义了一个量化规则，它借鉴了 `knowledge distillation` 的思想来识别这样的张量，也就是说，我们需要确定通过运算符传递的信息是否可以被提炼为低精度，且信息损失可接受。

> `knowledge distillation` （知识蒸馏）是一种深度学习模型压缩技术，旨在将一个复杂的模型转化为一个小而快速的模型，同时保持其性能。通常情况下，这种压缩技术可以在不牺牲模型精度的情况下，大幅减少模型的大小和计算资源的需求。
>
> 知识蒸馏的基本思想是将一个大型、复杂的模型（通常称为“教师模型”）的知识转移给一个小型、简单的模型（通常称为“学生模型”），以此来训练学生模型。具体地，教师模型的输出被用作对学生模型的训练目标，在训练过程中，学生模型的输出应该尽可能接近教师模型的输出。这样，学生模型可以从教师模型中学习到更多的知识，从而在保持高精度的同时，具有更小的模型大小和更快的推理速度。

由于信息损失可以通过算子的输入和输出张量来衡量，因此，我们这里使用的方法是针对于某个算子而言的，方法可以概括为以下步骤：

1. 使用训练/测试数据集对初始的 `DNN` 模型进行推理，并收集该算子的结果输入和输出张量来构建校准数据

2. 在保持其他张量不变的情况下，逐步降低该算子一个张量的量化精度(例如, 32 位到 16 位)。然后利用新精度下的标定数据对算子进行量化和微调

   > 微调的目的是在降低精度后，最小化校准数据中输出张量与该运算符输出张量之间的 `MSE`

3. 如果模型精度下降小于预先定义的阈值，则接受该算子的新量化属性，否则返回第二步

该过程对算子中的其他张量重复，直到所有张量都被评估。

为了减少收集校准数据的成本，`SparTA` 按照拓扑顺序遍历 `DNN` 模型中的所有算子，并缓存在早期量化传播中计算结果。收集一个算子的校准数据只需要从距离该算子最近的活跃缓存中进行部分推断。

例如，考虑一个两层的线性模型，层名分别为 $L_a, L_b$，在 $L_a$ 上的传播收集并缓存了其校准数据中的输出，于是，当工作在 $L_b$ 上时，它的校准数据可以通过从已缓存 $L_a$ 的输出做部分推断来收集。

## 传播规则的应用

定义了传播规则，我们通过注册的方式，将其注册，并在 `PropOneNode` 中使用这些规则，其基础的算法表示如下：

> 这里提供了一个自定义传播规则的方式

![image-20230608171619385](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230608171619385.png)

可以看见，基础的框架注册了前面提到的两个传播规则，这里也提供了一个接口（类似 `RPC`），通过写出自己的传播规则，然后将其注册到 `PropOneNode` 中去。

# 代码生成

至此，我们已经完成了对整个计算图的稀疏属性传播，所有的张量都带有 `TeSA` 抽象，然而在稀疏性属性传播后，`DNN` 模型中的张量可能混合有不同的稀疏性模式，混合的稀疏模式会使 `kernel` 代码生成变得困难。

> 所谓的不同稀疏性模式，是指在一个 `TeSA` 中量化不一致，例如某些元素通过 `int8` 量化，有些通过 `float16` 量化，导致了模式不同

因此 `SparTA` 将稀疏性模式复杂的张量转换为多个张量，每个张量具有更简单的稀疏性模式，并修改相关算子的执行计划，利用转换后的执行计划生成代码。

在[系统架构](#系统架构)中提到， `SparTA` 新增了两个额外的`pass`，以充分利用模型的稀疏特性，将代码生成分为三部分：

1. **Execution-plan transformation** ：将具有复杂稀疏模式的张量转换为简单稀疏模式，并提供一些 `hints` 用于之后阶段的代码生成
2. **TeSA code specialization** ：利用转化后的结果，为 `operator` 生成代码
3. **Traditional DNN Compiler** ：将为算子生成的代码置入传统的编译器（例如 `TVM`），生成深度学习模型

### `Execution-plan transformation`

如下图中，权重张量 $W$ 是一个混合精度的张量，其中两个结构化块使用 `8bit` 量化，两个细粒度元素使用 `32bit` 量化。`SparTA` 将 $W$ 变换为 $W_1$ 和 $W_2$，每个变换使用更简单的量化方案。因此，引入两个算子分别计算 $W_1 × I$ 和 $W_2 × I$，使用适合特定稀疏度属性的硬件指令。于是，原先带有一个算子的执行计划被转化为需要更多张量操作的新计划。

![image-20230617005559521](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230617005559521.png)

该 `pass` 将具有复杂稀疏模式的张量转换为规则稀疏模式，这有利于后续`pass`的进一步优化。

在`SparTA`中，规则稀疏模式意味着张量的`TeSA`仅显示一种量化属性和一种剪枝属性的块大小。

`DNN` 模型的详细执行计划转换是逐个操作符执行的，为了简单起见，我们假设算子有 $m$ 个输入和一个输出，形式化为如下：

![image-20230608211536565](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230608211536565.png)

该过程从算子的输入和输出`TeSA`开始，每个`TeSA`都可以通过`TransformTeSA`转换为一个或多个`TeSA`。相应地，算子转化为 $|T_o|\Pi^m_{i=1}|T_i|$ 子算子，它们是分解后的 `TeSA` 的笛卡尔积，子算子通常与原始算子具有相同的计算逻辑。

注意到 `TransformOp` 是一个重复的搜索过程。给定一个`TeSA`，`TransformTeSA` 可能有多个改造方案。该过程对每个计划进行迭代，找到满意的方案。

例如：

![image-20230608214046823](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230608214046823.png)

第一个矩阵可以转化为两个精度不同的矩阵，也可以转化为一个精度下降却一致的矩阵；

第二个稀疏 `TeSA` 可以分解为两个 `TeSA`，一个分块大小为`2x2`，另一个分块大小为`1x1`；也可以转换为一个块大小为`2x2 `的 `TeSA`，并将修剪后的元素置零，或者转换为一个块大小为 `1x1` 的 `TeSA`。

> 需要注意的是，该算法可能决定不对张量进行分解，并选择 `1x1` 的块大小，这表明 `TeSA` 具有细粒度的稀疏性，难以转化为常规的稀疏性。

`TransformTeSA` 实现了转换一个 `TeSA` 的逻辑。它首先在 `BitRounding` 中分解 `TeSA`，例如，如果硬件同时支持`4 bit`和`8 bit`指令，则至少有两种舍入选项：

1. 相应地舍入到`4 bit`和`8 bit`
2. 将全部舍入到 `8 bit`

对于 `BitRounding` 返回的每个 `TeSA`， `WeightedBlockCover` 选择一个或多个合适的块大小来覆盖未修剪的元素，我们将其视为一个加权集合覆盖问题。

每个分块大小的权重对应于底层硬件上分块大小的计算代价，我们使用一个简单的贪心算法挑选代价最小的块，直到覆盖所有未剪枝的元素。

为了帮助代码生成，每个变换后的 `TeSA` 都附加了比特宽度和块大小的信息，这些信息将传递到下一层进行处理。

## `TeSA code specialization`

这部分专门为每个(子)运算符编写内核代码，由上一层产生的提示信息指导生成策略。

编写代码的部分我们可以距离如下：

![image-20230608174121152](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230608174121152.png)

可以发现，从上一个 `pass` 分解后，在这里我们为 $W_1 × I$ 和 $W_2 × I$ 生成了更适合其计算的代码

注意到，在上一个 `pass` 中，我们只考虑了量化的元素，剪枝的部分我们并未考虑，应此在这里生成 `kernel code` 时，我们需要做死代码消除，如下图所示：

![image-20230608220642156](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230608220642156.png)

上图中的 `a` 是一个稀疏矩阵乘法，`b` 和 `c` 是其具有不同转换方案的专用内核代码，这里首先将所有循环都展开，然后进行死代码消除

这个做法论文中称之为 `dismantle` ，一种新的调度源语。当在一个循环上应用此源语时，这个循环和它的所有外循环在给定的稀疏属性下被展开和特殊化。

> 这里的死代码消除是指由于矩阵的稀疏属性，所以循环体中有许多运行都是死计算，需要被消除

## `Traditional DNN Compiler`

将生成的部分集成到传统的编译器中，在这里论文中采用了 `Rammer`，其在`Rammer`中实现了执行计划转换，增加了一个 `pass`，用更好的执行计划重写图。将专门的子操作符注入`Rammer` 的内核 DB 中，用于构建整个可执行文件。

# 效果

以下图为例：

![image-20230617010709091](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230617010709091.png)

其中 `TVM-S` 与 `Rammer-S` 为 `TVM Sparse` 和 `Rammer Sparse`，论文着重对比的是 `bert`，其重点实际上在于对 `Matmul` 算子的优化，当然后面两个模型也对比了对 `conv` 的优化

# 源码解析

源码的解析路线与 [系统架构](#系统架构) 类似，由于代码会进行封装，因此我们只能采取从抽象到实现过程的解析

## `Core`

从 `SparTA` 的核心入手，我们可以知道，这部分应该是所有方法的统一抽象接口，用户调用此接口从而调用 `SparTA`，其源码为：

```python
class SpartaModel(nn.Module):
    def __init__(self, model: nn.Module):
        super().__init__()
        self.model = model
        self.opt_modules = None
        self.opt_model = None
        self.opt_model = self._optimize_sparsity()

    def _optimize_sparsity(self):
        post_sparsity = propagate_sparsity(self.model)
        opt_model = optimize_and_rebuild(self.model,
                                         post_sparsity,
                                         backend='pytorch',
                                         device_info=None)
        return opt_model

    def forward(self, *inputs):
        return self.opt_model(*inputs)
```

可以发现，在这里调用了 `propagation` 中的方法，也就是说：在 `core` 中，我们的处理步骤是：

1. 将传入的 `pytorch` 模型通过 `propagate_sparsity` 进行 `TeSA` 以及稀疏性的传播
2. 将传播后的模型放入后端进行进一步优化，也就是
   1. 稀疏模式的转化（用于量化）
   2. 死代码的消除（用于剪枝）
3. 返回优化后的模型

注意到返回的方法称为 `forward` ，在某种程度上可以视为这个过程是迭代进行的

## `Propagation`

对于 `propagate_sparsity` 函数而言：

```python
def extract_sparsity(model: nn.Module):
    model_sparsity = ModelSparsityInfo()
    for name, module in model.named_modules():
        print('module name: ', name)
        weight_tesa = input_tesa = output_tesa = None
        if hasattr(module, 'weight_tesa'):
            weight_tesa = module.weight_tesa
        if hasattr(module, 'input_tesa'):
            input_tesa = module.input_tesa
        if hasattr(module, 'output_tesa'):
            output_tesa = module.output_tesa
        if weight_tesa != None or input_tesa != None or output_tesa != None:
            model_sparsity.update(
                SparseModuleInfo(name, module, weight_tesa,
                    input_tesa, output_tesa)
            )
    return model_sparsity

def propagate_sparsity(model: nn.Module) -> ModelSparsityInfo:
    pre_sparsity = extract_sparsity(model)
    # mocked
    post_sparsity = pre_sparsity
    return post_sparsity

```

可以发现其调用了 `common` 中的接口 `ModelSparsityInfo` 与 `SparseModuleInfo` ，我们将此文件中的接口进行分解。

### `TeSA`

```python
class TeSA:
    def __init__(self, tesaattr_tensor: torch.Tensor):
        self.tesa: torch.Tensor = tesaattr_tensor
        self.block_size: tuple = None
        self.n_bits: int = None

    def set_transform_meta(self, block_size: tuple, n_bits: int):
        self.block_size = block_size
        self.n_bits = n_bits
```

显然这里的 `TeSA` 和论文中描述的结构并不一致，这里只存储了其特征部分，并且存储了一些信息（多少位对齐，覆盖的块的大小）

### `SparseModuleInfo`

```python
class SparseModuleInfo:
    def __init__(self, module_name: str,
                 module_obj: nn.Module,
                 weight_tesa: torch.Tensor = None,
                 input_tesa: torch.Tensor = None,
                 output_tesa: torch.Tensor = None):
        self.module_name = module_name
        self.module_obj = module_obj
        self.weight_tesa = TeSA(weight_tesa)
        self.input_tesa = TeSA(input_tesa)
        self.output_tesa = TeSA(output_tesa)
```

通过传入的 `nn.Module` 与设置的 `attr` 进行设置，我们可以编写如下的样例：

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class WrapLinear(nn.Module):
    def __init__(self, hidden_size):
        super().__init__()
        self.fc2 = nn.Linear(hidden_size, 32)

    def forward(self, x):
        return self.fc2(x)

class Net(nn.Module):
    def __init__(self, hidden_size):
        super(Net, self).__init__()
        self.conv1 = nn.Conv2d(1, 20, 5, 1)
        self.conv2 = nn.Conv2d(20, 50, 5, 1)
        self.fc1 = nn.Linear(4*4*50, hidden_size)
        self.wfc2 = WrapLinear(hidden_size)

    def forward(self, x):
        x = F.relu(self.conv1(x))
        x = F.max_pool2d(x, 2, 2)
        x = F.relu(self.conv2(x))
        x = F.max_pool2d(x, 2, 2)
        x = x.view(-1, 4*4*50)
        x = F.relu(self.fc1(x))
        x = self.wfc2(x)
        return F.log_softmax(x, dim=1)

from sparta.common import SparseModuleInfo
model = Net(128)
wraplinear = model.wfc2
linear = wraplinear.fc2
# linear 是一个 nn.Linear(128, 32) 也就是一个线性变换而已
print("Origin Module weight", linear.weight)

tesa = torch.ones_like(linear.weight, dtype=torch.int8)
tesa[0][0] = 0
# 为 linear 添加特有的属性
setattr(linear, 'weight_tesa', tesa)
in_tesa = torch.ones(32, 128, dtype=torch.int8)
setattr(linear, 'input_tesa', in_tesa)
out_tesa = torch.ones(32, 10, dtype=torch.int8)
setattr(linear, 'output_tesa', out_tesa)

TeSA = SparseModuleInfo("Linear", linear, tesa, in_tesa, out_tesa)
print("After Sparsity ", (TeSA.weight_tesa.tesa, TeSA.input_tesa.tesa, TeSA.output_tesa.tesa))

```

运行结果如下图所示：

![image-20230613165736133](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230613165736133.png)

可以发现，这一层的 `W`, `I`, `O` 的 `Tensor` 均已生成了其 `TeSA` 特征矩阵

### `ModelSparsityInfo`

```python
class ModelSparsityInfo:
    def __init__(self):
        self.modules_info: dict = {}

    def update(self, info: SparseModuleInfo):
        if info.module_name in self.modules_info:
            ...
        else:
            self.modules_info[info.module_name] = info

    def items(self):
        return self.modules_info.items()
```

这个类的作用是用于记录每一个模块的 `W` , `I`, `O` 是否已经被抽象为 `TeSA` ，若是，则存储在 `modules_info` 中（注意这里会将相同名称的模块合并）

回到对应的 `propagation` 函数

### `extract_sparsity`

```python
def extract_sparsity(model: nn.Module):
    model_sparsity = ModelSparsityInfo()
    for name, module in model.named_modules():
        print('module name: ', name)
        weight_tesa = input_tesa = output_tesa = None
        if hasattr(module, 'weight_tesa'):
            weight_tesa = module.weight_tesa
        if hasattr(module, 'input_tesa'):
            input_tesa = module.input_tesa
        if hasattr(module, 'output_tesa'):
            output_tesa = module.output_tesa
        if weight_tesa != None or input_tesa != None or output_tesa != None:
            model_sparsity.update(
                SparseModuleInfo(name, module, weight_tesa,
                    input_tesa, output_tesa)
            )
    return model_sparsity
```

此函数接受一个 `Module`，对其含有的所有张量（`W`, `I`, `O`）进行进行更新

### `propagate_sparsity`

```python
def propagate_sparsity(model: nn.Module) -> ModelSparsityInfo:
    pre_sparsity = extract_sparsity(model)
    # mocked
    post_sparsity = pre_sparsity
    return post_sparsity
```

在此函数中，调用了 `extract_saprsity` 进行稀疏性属性的更新

> 但实际上代码写的并没有更新的逻辑

> [!bug]
> 
> 对于传播而言，在之前提到存在 `TeSA` 代数与 `scrambling`，但实际上只提供了代数的实现，其中 `True` 表示未剪枝元素，`Flase` 表示剪枝元素
>
> ```python
> class Algebra:
>     def __init__(self, val):
>         self.val = bool(val)
>
>     def __add__(self, ele):
>         return Algebra(self.val or ele.val)
>
>     def __mul__(self, ele):
>         return Algebra(self.val and ele.val)
> ```
>
> 对于传播而言，我们通过传入 `I_1` `I_2` 与 `O_1` 进行传播运算，首先进行前向传播，从输入到输出，然后进行反向传播，从输出到输入，输入到输入
>
> ```python
> def propagate_matmul(tesa_in1: TeSA, tesa_in2: TeSA, tesa_out: TeSA) -> Tuple[TeSA, TeSA, TeSA]:
>
>     prop_tesa_out = algebra_matmul(tesa_in1, tesa_in2)
>     tesa_out = merge_tesa(tesa_out, prop_tesa_out)
>
>     prop_tesa_in1 = algebra_matmul(tesa_out, transpose(tesa_in2))
>     tesa_in1 = merge_tesa(tesa_in1, prop_tesa_in1)
>     prop_tesa_in2 = algebra_matmul(transpose(tesa_in1), tesa_out)
>     tesa_in2 = merge_tesa(tesa_in2, prop_tesa_in2)
>     return tesa_in1, tesa_in2, tesa_out
> ```
>
> 其具体的实现如下：
>
> ```python
> def algebra_matmul(tesa_in1: TeSA, tesa_in2: TeSA) -> TeSA:
>     m, k = tesa_in1.tesa.size()
>     n = tesa_in2.tesa.size()[1]
>     tesa_out = TeSA(torch.zeros(m, n))
>     for i in range(m):
>         for j in range(n):
>             tmp = Algebra(tesa_out.tesa[i][j])
>             for x in range(k):
>                 tmp += Algebra(tesa_in1.tesa[i][x]) * Algebra(tesa_in2.tesa[x][j])
>             tesa_out.tesa[i][j] = tmp.val
>     return tesa_out
>
>
> def transpose(tesa: TeSA) -> TeSA:
>     return TeSA(torch.transpose(tesa.tesa, 0, 1))
>
> def merge_tesa(ta: TeSA, tb: TeSA) -> TeSA:
>     m, n = ta.tesa.size()
>     for i in range(m):
>         for j in range(n):
>             ta.tesa[i][j] = ta.tesa[i][j] and tb.tesa[i][j]
>     return ta
> ```
>
> 其传播的规则与先前论文中提到的完全一致，由于梯度的 `TeSA` 与原 `TeSA` 一致，因此这里直接略去了梯度的描述，直接使用原本的 `TeSA` 进行计算

## `Code gen`

根据上面的系统架构，这里分为三个 `pass` ，在源码中，其缩略为一个函数 `optimize_and_rebuild`，具体的逻辑为如下：

```python
def optimize_and_rebuild(model: nn.Module,
                         post_sparsity: ModelSparsityInfo,
                         device_info = None):

    opt_modules = {}

    tpolicy = TransformPolicy(device_info)
    for module_name, module_sparsity in post_sparsity.items():
        transformed = tpolicy.transform_module(module_sparsity)
        opt_modules[module_name] = transformed
    return opt_model
```

可以发现，逻辑都围绕着 `TransformPolicy` 展开，下面对其进行介绍

### `init TransformPolicy`

在这里只是定义了 `device_info` ，也就是 `target` 的平台，但在源码中似乎并没有考虑，可能只是为了后续的拓展而写的

### `transform_module`

在使用上，这里通过遍历每个算子（或者延续之前的称呼 模块），对其进行变换，使得其成为优化后的算子（或模块），其简化的逻辑如下：

```python
    def transform_module(self, module_sparsity: SparseModuleInfo):
        kernels = None
        if isinstance(module_sparsity.module_obj, nn.Linear):
            kernels, aggr_type = self.transform_matmul(module_sparsity.input_tesa,
                                            module_sparsity.weight_tesa,
                                            module_sparsity.output_tesa)
        return TransformedModule(module_sparsity, kernels, aggr_type)
```

这里 `TransformedModule` 的声明如下：

```python
class TransformedModule:
    def __init__(self, module_info: SparseModuleInfo, kernels: list, aggregate_type: str = None):
        self.module_info: SparseModuleInfo = module_info
        self.kernels: list = kernels
        self.aggregate_type: str = aggregate_type
```

可以发现，这里实际上只支持了矩阵乘算子的优化，对于卷积算子与其他的并没有实现优化，而在这里，`transform_matmul` 的具体逻辑如下：

```python
    def transform_matmul(self, in_tesa: TeSA, weight_tesa: TeSA, out_tesa: TeSA):
        best_latency = float('inf')
        best_kernels = None
        best_aggr_type = None

        print('weight bit aligning...')
        weight_tesas = self.bit_align(weight_tesa)
        print('input bit aligning...')
        in_tesas = self.bit_align(in_tesa, decompose=False)
        print('output bit aligning...')
        out_tesas = self.bit_align(out_tesa, decompose=False)

        for w_tesas in weight_tesas:
            print('wbc_matmuls starting...')
            transform_options = wbc_matmuls(in_tesas[0], w_tesas, out_tesas[0])
            print('wbc_matmuls done.')
            '''
            # skip, waiting for more official end-to-end
            for (in_ts, w_ts, out_ts) in transform_options:
                # do not decompose in_tesa and out_tesa for simplicity
                assert(len(in_ts) == 1 and len(out_ts) == 1 and len(w_ts) >= 1)
                print("transformation done!")
                # then specialize kernels for this transformation option
                latency, kernels, aggr_type = specialize_matmul(in_ts, w_ts, out_ts)
                if latency < best_latency:
                    best_latency = latency
                    best_kernels = kernels
                    best_aggr_type = aggr_type
            '''
        return best_kernels, best_aggr_type
```

首先对数据进行对齐操作，然后开始枚举矩阵分块的大小，然后选择出最好的分块组合并返回

> 但作者把这部分注释了，这也表示这部分开源代码是无法跑出实验结果的

这里的 `wbc_matmuls` 意味不考虑被剪枝的元素，只考虑被量化的部分，找到最优的块来覆盖量化部分的区域，然后将此策略返回

首先来解释 `bit_align` 的做法：

```python
	def hardware_bit_precisions(self) -> list:
        # TODO: refine a device info class
        # currently, specific for 2080ti
        # int4, int8, float16, float32
        return [4, 8, 16, 32]

    def _extract_bit_nums(self, tesa: TeSA) -> set:
        bit_set = set()
        flat_tesa = tesa.tesa.reshape(-1)
        for ele in flat_tesa:
            bit_set.add(ele)
        if 0 in bit_set:
            bit_set.remove(0)
        return bit_set


    def _convert_tesa_bit(self, tesa: TeSA, aligned_bit: int):
        flat_tesa = tesa.tesa.reshape(-1)
        for i, _ in enumerate(flat_tesa):
            if flat_tesa[i] > 0:
                flat_tesa[i] = aligned_bit

    def _align_to_hardware_bits(self, bits: set, bit_options: list) -> bool:
        # NOTE: here assume hardware supported bit number is 2^x
        aligned_bits = set()
        for bit in bits:
            if bit <= 0:
                continue
            aligned_ideal_bit = 2 ** math.ceil(math.log(bit,2))
            if aligned_ideal_bit in bit_options:
                aligned_bits.add(aligned_ideal_bit)
            else:
                aligned_bits.add(min([b for b in bit_options if b > aligned_ideal_bit]))
        return aligned_bits

    def bit_align(self, tesa: TeSA, n_candidates: int = 1, decompose: bool = True) -> List[tuple]:
        bit_options = self.hardware_bit_precisions()
        print('start extracting bit nums...')
        bits = self._extract_bit_nums(tesa)
        print('extracting bit nums done.')
        aligned_bits = self._align_to_hardware_bits(bits, bit_options)
        print('aligning bit nums...')
        if not decompose or len(aligned_bits) == 1:
            aligned_bit = max(bits)
            if aligned_bit not in bit_options:
                aligned_bit = min([bit for bit in bit_options if bit > aligned_bit])
            if len(aligned_bits) == 1:
                assert aligned_bit == aligned_bits.pop()
            self._convert_tesa_bit(tesa, aligned_bit)
            tesa.n_bits = 1
            return [(tesa,)]
        else:
            # NOTE: only handle at most 2 different bits
            assert len(aligned_bits) == 2
            return self._convert_tesa_bits(tesa, aligned_bits)
```

在这里，作者只考虑了在 `2080Ti` 上可运算的类型 `int4` `int8` `float16` `float32` 四个选项，随后，对输入的 `TeSA` 进行遍历，找到其不为零的元素（即量化的元素）集合，接着，对此集合内的每一个元素，找到一个最小的 `bit_options` （也就是前面的可运算类型的选项）进行量化，具体做法为将这些对齐的值加入集合中，最后返回此集合。

最终，我们得到的是一个对输入的 `TeSA` 中非零元素数值的最小对齐值的集合

接着，对于不需要分解的 `TeSA` 或是所有元素都对齐到一个类型的情况，我们直接将 `TeSA` 中的所有元素进行对其；否则，我们只能处理拥有**两种**不同对齐的情况

> 但实际上对于两种不同对齐的情况，这里做的也只是直接量化到较大的精度上去

将元素对齐后，接着我们需要进行下图中步骤

![image-20230608174121152](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230608174121152.png)

但在代码中，将其抽象为一个函数 `wbc_matmul` 即 `*weighted block cover matmul` ，在论文中的思路为：

1. 对算子中的权值张量 $W$ 进行分解，其做法为贪心的考虑以最小消耗的块来覆盖此张量中的非零元素
2. 分解后进行算子的生成

```python
def available_covering_size() -> Dict[Tuple[int, int], float]:
    cover_sizes = {
        (1, 1): 0.0064,
        (32, 32): 6.25,
        (32, 64): 8.59,
        (64, 32): 25.2,
        (32, 128): 16.02,
        (64, 64): 50,
        (64, 128): 96.8
    }
    return cover_sizes

def wbc_matmul(in_tesa: TeSA, w_tesa: TeSA, out_tesa: TeSA) -> List[tuple]:
    cover_sizes = available_covering_size()
    # weighted block cover
    chosen_blocks, unique_block_sizes = weighted_block_cover(w_tesa, cover_sizes)
    print('chosen block sizes: ', unique_block_sizes)
    if len(unique_block_sizes) == 1:
        w_tesa.block_size = unique_block_sizes.pop()
        return [(in_tesa, w_tesa, out_tesa)]
    else:
        # TODO: support more than one block size
        decompose_blocked_tesas(w_tesa, chosen_blocks, unique_block_sizes)
        raise

def wbc_matmuls(in_tesas: tuple, w_tesas: tuple, out_tesas: tuple) -> List[tuple]:
    transform_options = []
    in_tesa = in_tesas[0]
    out_tesa = out_tesas[0]
    for w_tesa in w_tesas:
        transformed = wbc_matmul(in_tesa, w_tesa, out_tesa)
        transform_options.extend(transformed)
    return transform_options
```

在通过 `available_covering_size` 获取到每个分块大小的权重对应于底层硬件上分块大小的计算代价后，进行 `weighted_block_cover` 覆盖，这可以看作一个加权集合覆盖问题，选择出一个代价最小的块，使其恰好能够覆盖非零元素集合。

> 但实际上，在 `wbc_matmul` 中可以发现，这个算法只会返回一个块，也就是说只会使用一个块将其覆盖，暂时并不支持分解成多个块
>
> 这样做不会错的原因是可能是因为在上一步对齐中，将所有量化的数据都对齐到了一个层次，因此在这里就不需要分解了

接着就没有其他处理步骤了，循环展开与死代码消除均没有实现，因此开源代码是不全的，不能跑出实验结果。

# 实验复现

在 `artifact` 分支中，给出了复现的方法，运行他给定的脚本，跑出论文中的图进行复现，这里以 `figure8` 为例，进行讲解。

> 现在已经不能复现实验了，因为预训练模型的 `url` 错误，也就是说模型已经被删除，无法下载

注意 `SparTA` 的输入是一个 `DFG`，因此，在脚本中，作者首先通过运行如下脚本，利用 `ONNX` 生成带有 `TeSA` 的 `DFG`：

```python
device = torch.device('cpu')
config = torch.load('Coarse_bert_config')
dummy_input = torch.load('dummy_input.pth', map_location=device)
data = (dummy_input['input_ids'].to(device), dummy_input['attention_mask'].to(device), dummy_input['token_type_ids'].to(device))
norm_model = BertForSequenceClassification(config=config).to(device)

mlp_prune_cfg = torch.load('checkpoints/coarsegrained/mlp_coarseprune_cfg')
bert_head_size = 64
token = BertTokenizer.from_pretrained('checkpoints/finegrained/checkpoint-220000')
mask_file = 'checkpoints/coarsegrained/coarse_baseline_mask.pth'


ms = ModelSpeedup(norm_model, data, mask_file, break_points=[], confidence=32)


propagated_mask = ms.propagate_mask()
ori_mask =  torch.load(mask_file)


BertCompressModule(norm_model, propagated_mask, mlp_prune_cfg)
norm_model.load_state_dict(torch.load('checkpoints/coarsegrained/nni_weights.pth'))



pruner= apply_mask(norm_model, propagated_mask)
acc = evaluate(norm_model.cuda(), token)

print('Accuracy:', acc)
print('Propagate done')

pruner._unwrap_model()
export_tesa(norm_model.cpu(), data, 'artifact_bert_coarse_onnx_with_tesa', propagated_mask)
```

注意到，在 `ms.propagate_mask()` 中直接进行了稀疏特征的传播，但这里并未使用开源项目中的函数，应该是从 `nni` 框架中实现的传播规则。

于是，输出的文件 `tesaid_2_name` 为一个 `DFG` 且带有 `TeSA` 特征，我们可以认为其节点的结构如下（因为在后续只用到了这些属性）：

```json
{
    "1": {
        "in_shape": [[32, 128, 768]],
        "out_shape": [[32, 128, 64]],
        "weight_shape": [[64, 768]],
        "type": "<class 'torch.nn.modules.linear.Linear'>",
        "state": {
            "weight": [[[123, 121, ...],...]...],
            "bais": [...]
        }
    },

}
```

在使用 `SparTA` 的代码中（这里以 `fp32` 计算为例）

```python
tesaid_2_names_file = "artifact_bert_coarse_onnx_with_tesa/tesaid_2_names"
tesaid_2_names = torch.load(tesaid_2_names_file)
config = {}

id_shapes_name = "id_shapes"
f = open(id_shapes_name)
id_shapes = json.load(f)

for tesa_id, name_list in tesaid_2_names.items():
    pytorch_name, onnx_name = name_list[0], name_list[1]
    shape_dict = id_shapes[str(tesa_id)]
    if len(shape_dict['in_shape'][0]) == 3:
        m = shape_dict['in_shape'][0][0] * shape_dict['in_shape'][0][1]
        k = shape_dict['in_shape'][0][2]
        n = shape_dict['out_shape'][0][2]
    elif len(shape_dict['in_shape'][0]) == 2:
        m = shape_dict['in_shape'][0][0]
        k = shape_dict['in_shape'][0][1]
        n = shape_dict['out_shape'][0][1]
    config[pytorch_name] = {'tesa_id': str(tesa_id), 'm': m, 'k': k, 'n': n}

pattern = "bert_coarse_fp32"

result = generate_code(config, pattern)

with open("kernel_dict.json", "w") as outfile:
    json.dump(result, outfile)
```

注意到，这里并没有要 `weight` 张量的值，而只是要了 `TeSA` 的形状，随后进行代码生成，其逻辑是一个简单的 `switch` ，将其转到 `bert_coarse_fp32_codegen` 中：

```python
def bert_coarse_fp32_codegen(config: dict) -> dict:
    print(f"current_path: {current_path}")
    result = {}
    log_name = os.path.join(current_path, "Log/bert_coarse_fp32.json")
    template_name = os.path.join(current_path, "Template/block_sparse_template_bias_row.cu")
    f = open(log_name)
    log_dict = json.load(f)
    f_template = open(template_name)
    template_str = f_template.read()
    for name, val_dict in config.items():
        tesa_id = val_dict['tesa_id']
        m, k, n = val_dict['m'], val_dict['k'], val_dict['n']
        if tesa_id in log_dict:
            template_config = log_dict[tesa_id].copy()
        else:
            template_config = log_dict["other"].copy()
        template_config['M_VALUE'] = m
        template_config['K_VALUE'] = k
        template_config['N_VALUE'] = n
        if n <= template_config['BLOCK_SIZE_N_VALUE']:
            template_config['BLOCK_SIZE_N_VALUE'] = n
        if m <= template_config['BLOCK_SIZE_M_VALUE']:
            template_config['BLOCK_SIZE_M_VALUE'] = m
        block_size_m = template_config['BLOCK_SIZE_M_VALUE']
        block_size_k = template_config['BLOCK_SIZE_K_VALUE']
        block_size_n = template_config['BLOCK_SIZE_N_VALUE']
        thread_size_m = template_config['THREAD_SIZE_M_VALUE']
        thread_size_k = template_config['THREAD_SIZE_K_VALUE']
        thread_size_n = template_config['THREAD_SIZE_N_VALUE']
        kernel_code = template_str
        for key, value in template_config.items():
            kernel_code = kernel_code.replace(key, str(value))
        launch_config = {}
        launch_config['dimBlock'] = [int(block_size_n / thread_size_n), int(block_size_m / thread_size_m)]
        launch_config['dimGrid'] = [int(n / block_size_n), int(m / block_size_m)]

        print(f"tesa id: {tesa_id}, module name: {name}, launch_config: {launch_config}, shape:{[m, k, n]}")

        result[name] = {'code': kernel_code, 'launch_config': launch_config, 'block_size_k': block_size_k, 'block_size_n': block_size_n}
    return result
```

注意这里在一开始加载的两个文件，`json` 文件中描述了对不同的 `TeSA` 应该采取什么样的措施（块的大小，线程的数量）：

```json
{
    "5": {
        "THREAD_SIZE_N_VALUE": 8,
        "THREAD_SIZE_K_VALUE": 1,
        "THREAD_SIZE_M_VALUE": 8,
        "BLOCK_SIZE_N_VALUE": 128,
        "BLOCK_SIZE_K_VALUE": 8,
        "BLOCK_SIZE_M_VALUE": 64
    },
}
```

而 `cu` 文件描述了算子的计算，实际上是解释分块如何进行计算，线程如何进行调度等，但需要注意如下这一步：

```c
int index_start = W_row[bx], index_end = W_row[bx+1];
```

这里就是稀疏的解决方法，通过这个方式来索引非零元素进行计算，显然这种方式只适合稀疏度较高的矩阵，并且通用性不强，和论文中描述的更是大相径庭。

通过读取这个模板文件，然后通过字符串的替换，选择在 `json` 文件中配置的最佳值进行代码的生成，最终 `result` 中的 `code` 就是替换之后的 `cuda` 代码。
