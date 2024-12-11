---
title: SparseTIR 解读
description: 
tags:
  - Compiler
  - MLSys
date: 2023-06-16
lastmod: 2024-12-11
draft: false
---

`SparseTIR` 解读（[论文](https://dl.acm.org/doi/pdf/10.1145/3582016.3582047)、[源码](https://github.com/uwsampl/SparseTIR) ）

# `Introduction`

以`Halide`/`TVM`为代表的张量运算编译器，引入了计算与调度分离的概念，使得大家可以只用写一套计算描述(`Tensor Expression`，只与计算的数学形式有关)，用不同的调度原语(`Schedule Primitive`)来描述如何去优化程序(如何做矩阵分块，绑定线程，利用缓存，设计流水线，利用硬件的加速单元)，这个过程可以手动，也可以利用自动化的调度模板生成（例如 `AutoTVM`）并搜索，从而为不同的硬件后端生成高效的代码。

但是最初的`Halide`和`TVM`都是针对稠密/规整运算设计，因此很难对于深度学习中的稀疏算子做统一的抽象和优化，在之前`TVM`对于稀疏矩阵需要手写每一个手动优化好的算子，无法利用调度原语设计统一的优化方案。

稀疏运算编译器，随着 `TACO` (`The Tensor Algebra Compiler`)等项目的出现重新进入人们视野，其主要思路是计算与数据结构分离，使得大家可以只写一套计算描述和一套数据结构的描述。而在图形学中很多数据有 **spatially sparse**(全局稀疏，局部稠密)的特性，使用专门设计的的层次化数据结构来存储会有更高的效率。

因此能否把这两类工作结合到一起，从而减少手写稀疏算子的负担，应对深度学习中各种不同算子/格式的组合，是 `SparseTIR` 这个项目的初衷。

包括`TACO`在内的稀疏矩阵编译器，利用他们强大的格式抽象可以表示结构化稀疏，但是目前并没有很好的硬件加速指令支持，从而并没能实现对结构化稀疏运算的有效加速。这是因为在张量编译器中，为了使用这些硬件指令，我们将程序中的子结构与硬件指令的描述相匹配，并替换为相应的指令实现，这个操作由特定的调度原语实现。

`Halide`和`TACO`这些编译器把所有的调度信息存储在`schedule tree`(调度树)`/provenance graph`(来源图)这样的中间数据结构上，这样的设计过于中心化：每个调度原语都会对调度树本身带来一些约束，调度原语之间可能会互相影响，给引入新的硬件指令带来了困难。

`TVM`中新的算子级别抽象 `TensorIR` 的提出正是为了解决如何使用硬件加速单元的问题，`TensorIR `放弃了 `schedule tree`这些中间数据结构，而是把所有的信息记录在`IR`本身，通过这样的设计解耦了调度原语之间的相互制约，调度原语本身只会与`IR`进行交互，因此加入新的硬件指令不需要考虑其对其它调度原语的影响，可以更有效率地支持大量的硬件指令。

每一个调度原语都被写成了一个带参数的程序转换函数(效果上等价于`Compiler Pass`)，为了与硬件加速单元适配，`TensorIR` 提出了 `block` (块)这样的抽象，每一个 `block`都是整个运算的一个子结构(可以描述计算或者数据搬运)，调度原语可以操作这些 `block`及其外部的循环结构，与加速单元的语义描述相匹配的 `block`可以被替换为相应的硬件加速指令。

相比于原来的`Tensor Expression`前端，`TensorIR`的表达力足够强大，有循环和”块”这样的数据结构，已经可以用来手写一些稀疏算子(`TVM`原有的`Tensor Expression`只能描述循环体内的操作)，但是相比于`TACO`，仍然需要手动处理稀疏数据结构的编码和解码过程。

因此，面临的问题几个：

1. `TVM` 等传统编译器并不支持稀疏运算的支持
2. `TVM` 中初始的 `Relay` 甚至 `TensorIR` 都不能很好的描述稀疏数据结构
3. `TACO` 没有很好的硬件加速指令支持，运算速度较慢
4. `TACO` 中的调度算法的设计过于中心化，每个调度原语都会对调度树本身带来一些约束，调度原语之间可能会互相影响。

因此，这里提出了 `SparseTIR` 来应对这些问题

# 系统架构

![image-20230609133345768](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230609133345768.png)

`SparseTIR` 整个的编译流程可以总结为上图。

`SparseTIR` 分为了三个阶段：`Stage I`(坐标空间计算)→ `Stage II`(位置空间计算)→ `Stage III`(`TensorIR`)，并设计了两个`lowering`(递降)算法，分别表示`I`到`II`阶段，`II`到`III`阶段的转换。

程序被变换成`TensorIR`之后，就可以直接使用`TVM`已有的`pass`继续生成不同设备的代码。

在`SparseTIR`中，我们也希望所有的调度都在`IR`本身完成，这里将所有的调度原语也分为了三类，分别在`IR`的三个阶段使用，这样的设计有别于以往的张量编译器中`single-shot scheduling`(一次性发射所有的调度指令)的设计，有助于我们同时考虑高层级和低层级的优化:

1. 在第一阶段中，我们可以进行稀疏格式感知的优化(例如`DecomposeFormat`)。
2. 在第二和第三阶段中，我们的`IR`更接近与底层，可以进行硬件感知的优化(例如使用硬件加速指令等等)。

其中不同的阶段的调度选择，以及格式分解的选择，构成了`SparseTIR`的整体搜索空间，因此可以进行(格式\*调度的整体优化)

`SparseTIR`没有像`TACO`一样提出具体的搜索算法，而是提出了一个框架让用户自己指定搜索空间。

> 需要注意的是 `SparseTIR` 暂时未支持 `Auto Scheduling`，也没有任何默认的算法

# `SparseTIR` 的抽象设计

首先明确， `SparseTIR` 是依赖于 `TVM` 与 `TensorIR` 的，因此，这个实际上是以 `TensorIR` 为基础的一个处理稀疏数据拓展版本。

这里作者提出一个观点：

> 我们观察了非结构化稀疏运算的`GPU`算子常用优化，主要要点在于`load-balance`(负载均衡)和访存优化。这两者都属于被研究了几十年的老大难问题，性能高度依赖于非零元素本身的分布。深度学习中很多稀疏矩阵的非零元素分布是固定的(`stationary-sparsity`)，如果我们能在编译期就利用这些信息提前做好调度，那么可以省掉很多运行时调度的开销。

因此，`SparseTIR` 设计了可组合式的抽象：**Composable Formats(可组合的格式)** 和 **Composable Transformations(可组合的程序变换)**

## 可组合的格式

`Composable Formats` 代表，虽然很多矩阵本身很难挖掘出整体结构，但是我们把它分解成很多更小的结构化稀疏矩阵之和，不同的部分用不同的格式来存，其中每一个小矩阵都更加对硬件友好，相比于把整个稀疏矩阵做 `padding` 或者 `block-sparse` 化，带来的块内碎片会显著更少。如下图所示：

![image-20230609124310519](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230609124310519.png)

## 可组合的程序变换

把程序变换分解到 IR 的各个层级，多级调度，使得我们可以在同一个框架下完成数据感知的高语义层级优化和偏硬件层级的优化。

## 格式抽象与矩阵存储

格式描述是 `SparseTIR` 的一等公民，其对于矩阵的描述与存储延续了 `TACO` 的一些理念：

`SparseTIR` 创建了一个类似的 `axis(sparse iterator)` 结构，保留了`TACO`的 `dense/compressed(sparse)`属性，并增加了一组属性`fixed/variable`，表示当前维度是定长还是变长

> 这有助于我们生成更高效的代码——编译期能得到的信息越多，可能做的优化就越多。

1. 传统的稠密矩阵的每一个维度在 `SparseTIR` 中都会使用 `dense_fixed`来标注，代表其连续而且定长；
2. 对于非零元位置不连续(稀疏)的维度，我们使用 `sparse`来标注，需要指定 `indices`数组存储其非零元的坐标；
3. 对于长度不一定的维度，我们使用 `variable`来标注，需要指定 `indptr`数组，储存每一个`fiber`(`fiber`是”行”和”列”在高维稀疏矩阵中的拓展)的初始指针位置。

所有的 `sparse`和 `variable`的维度都必须指定一个其依赖的维度，如果把每个`axis`向其依赖的`axis`连一条边，那么在一个`SparseTIR`的程序中，所有的`axis`会组成一个森林，而森林中每一个树的根节点都是 `dense_fixed`的。

例子如下：

```python
# I is a dense fixed iterator.
I = T.dense_fixed(m)
# J1 is a sparse fixed iterator, whose dependent iterator is I
# it has maximum length n and number of non-zero elements per row: c,
# the indices data are stored in the region started from indices_1 handle,
# and the index data type (in indices array) is int32.
J1 = T.sparse_fixed(I, (n, c), indices_1, idtype="int32")
# J2 is a dense variable iterator, whose dependent iterator is I,
# it has a maximum length of n,
# the indptr data are stored in the region started from indptr_2 handle,
# and the index data type (in indptr array) is int32.
J2 = T.dense_variable(I, n, indptr_2, idtype="int32")
# J3 is a sparse variable iterator, whose dependent iterator is J1,
# it has maximum length of n1, number of elements nnz in the space composed of (I, J1, J3),
# the indptr data are stored in the region started from indptr_3 handle,
# and the indices data are stored in the region started from indices_3 handle,
# the index data type (of indptr and indices array) is "int64")
J3 = T.sparse_variable(J1, (n1, nnz), (indptr_3, indices_3), idtype="int64")
```

其存储的实例如下：

```python
I = T.dense_fixed(3)

J = T.sparse_variable(I, (4, 6), (indices_1=[1, 0, 2, 3, 1, 3], indptr=[0, 1, 4, 6]), idtype="int32")

A = T.match_sparse_buffer(a, (I, J), dtype="float32", scope="global")
```

![image-20230609131953909](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230609131953909.png)

这里的 $\mathbf{A}$ 就是一个 `CSR` 形式表示的矩阵，上图例子可以表示 $C = AB$

采用迭代器的存储设计，使得描述更易于拓展，可以定制更加复杂的矩阵结构，也方便描述一些具有特定分布的稀疏矩阵。

解决了矩阵的存储描述，我们还需要解决矩阵相乘的抽象，换而言之就是如何进行计算：

我们需要一个数据结构来指定程序的迭代空间，因此我们创建了一个叫做`sparse iteration`(稀疏迭代空间)的数据结构，其语法结构如下：

```python
with T.sp_iter([I, J, K], "SSR", "sddmm") as [i, j, k]:
    with T.init():
        Y[i, j] = 0.0
    Y[i, j] = Y[i, j] + A[i, k] * B[j, k] * X[i, j]
```

其接收一组迭代器( `[I, J, K]` )，并生成一组循环变量 `i, j, k`，在这个稀疏迭代空间的主体中我们可以写任意的数学表达式，来描述我们的计算，在稀疏迭代空间的语义中，我们无需考虑 `A`, `B` ,`X` , `Y` 具体的存储格式，只需当作他们是稠密数据结构来描述数学运算，我们将这个阶段的数学运算称为(坐标空间计算)。

# `Stage` 解读

## `Stage I`

1. 格式分解
2. 空间坐标计算
3. 调度

在前文中我们提到可以把计算分解到更小的结构化稀疏矩阵中，在`SparseTIR`中，这通过一个`pass`: `DecomposeFormat`来实现:

用户需要提供一组`FormatRewriteRule`(使用`TVMScript`)来指定新的子矩阵格式，作为参数传给`DecomposeFormat`这个`pass`，随后这个`pass`将会生成新的子矩阵所需要的`axis`和`sparse buffer`，并把原来在原有稀疏迭代空间中的矩阵运算改写成在新的结构化稀疏迭代空间上的运算

如下图例子所示，将`CSR`格式的计算分解为`BSR`格式的计算后生成的稀疏矩阵-矩阵乘法（`SpMM`）的`IR`，块大小为 2，每行有 2 个非零列的 ELL 格式。除了对新格式的稀疏计算外，还产生了另外两个将数据从原始格式复制到新格式的稀疏迭代。当要分解的稀疏矩阵是静止的，我们可以在预处理步骤中进行数据复制，以避免运行时格式转换的开销。

![image-20230618195530349](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230618195530349.png)

这个 `pass` 会为新建的矩阵分配 `axis` 与缓冲区，并且会生成迭代空间，如：若定义了 $C = A\times B$，代码如下：

```python
with T.sp_iter([I, J, K], "SSR", "sddmm") as [i, j, k]:
    with T.init():
        C[i, j] = 0.0
    C[i, j] = Y[i, j] + A[i, k] * B[j, k]
```

在分解矩阵后，`pass` 会重写计算规则如下：

![image-20230618195832745](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230618195832745.png)

这一步就被称之为 **空间坐标计算**

> 注意这个`pass`本身对数据是不可知的，如何生成新的子矩阵每个维度的`indptr/indices`等信息，需要用户在运行时完成
>
> `SparseTIR`为一些论文中所使用的格式分解模式提供了一些运行时函数，对于通用的格式分解，如何自动化地推断出`indptr/indices`等信息，仍然是一个有趣的研究问题

关于第一阶段的调度，定义了两个调度源语，`sparse_reorder` 和 `sparse_fuse` 。

1. `sparse_reorder` 稀疏迭代中的稀疏轴的顺序影响第二阶段生成的循环的顺序。这个基元可以对稀疏轴的顺序进行操作
2. `sparse_fuse` 将一个给定的稀疏迭代中的几个迭代器融合成一个。例如想要一个单一的循环而不是两个在所有非零元素上迭代的嵌套循环。

我们可以从下图理解这两个源语：

![image-20230609140608461](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230609140608461.png)

## `Stage II`

区分 `Stage-I` 和 `Stage-II` 的一个重要标志是**坐标空间**(coordinate space)和**位置空间**(position space)的区分

其含义是逻辑上的坐标和在压缩存储格式下的物理位置，例如下图中，假设我们以 `1-base` 计数，元素`-1`的坐标为`4`，而位置为`2`

![img](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/v2-4ef95fcafced36434dfcd6d0874f482f_720w.webp)

对应到 `SparseTIR` 中，我们在`1`阶段的迭代变量和稀疏矩阵的访问语义均是在坐标空间中，到了`2`阶段，我们希望把所有的稀疏迭代数据结构改写成`TensorIR` 中的嵌套循环和`block` ，并把稀疏矩阵访问和循环变量的语义改写到坐标空间，使得`2`阶段的`IR`与`TensorIR`的调度原语兼容。

我们设计了一个`pass`: `Sparse Iteration Lowering`，用于从`1`阶段到`2`阶段`IR`的转换，坐标空间到位置空间的转换算法涉及稀疏结构的压缩/解压过程。

这个 `pass` 分为四步：

1. `Auxiliary buffer materialization` 在创建 `axis` 时，`indptr`和 `indices` 的指针被指定为参数。在第二阶段，我们需要明确声明这些辅助缓冲区，以便在确定循环范围和翻译坐标时访问它们的值。除了辅助缓冲区外，我们还创建了指示缓冲区值域的提示，这些提示在第二阶段执行调度时用于整数集分析。下图展示了其工作方式：

   ![image-20230609141127470](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230609141127470.png)

2. `Nested loop generation` 这一步将第一阶段的稀疏迭代重组为第二阶段的嵌套循环：我们在稀疏迭代中的每个 `axis` 发出一个循环。产生的循环从 $0$ 开始。它们被 `TensorIR` 的块结构分开，建立边界以防止跨块循环的重新排序。此外，我们在最内层生成的循环内添加一个块，并将原始稀疏迭代的主体置于其中。下图显示了不同稀疏迭代的嵌套循环结构：

   ![image-20230609141557718](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230609141557718.png)

3. `Coordinate translation` 这一步将用于访问稀疏缓冲区的指数从坐标空间改写为位置空间，以弥补第一阶段和第二阶段之间的语义差距。具体的做法可以参照下图：

   ![image-20230609141829580](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230609141829580.png)

   这里使用了在第一步中创建的辅助缓冲区 `J_indptr` 与 `J_indices`

4. `Read/Write Region Analysis` 缓冲区的读/写区域信息对于 `TensorIR` 的块构造是必要的。我们执行一个缓冲区区域分析来收集缓冲区的访问信息，并将每个块内访问的所有读/写区域联合起来，并将它们注释为块属性

关于这阶段的调度，其负责操作循环（`fuse`/`reorder`/`split`），在内存层次中移动数据（`cache_read`/`cache_write`），将循环与物理/逻辑线程绑定以使其并行化，并在硬件中使用矢量/张量指令（`vectorize`/`tensorize`）。由于在第二阶段已经完成了 `SparseTIR` 与 `TensorIR` 中调度源语的兼容，因此，我们在第二阶段完全支持 `TVM` 调度源语。

值得一提的是，`SparseTIR` 目前只支持生成嵌套循环，尚不支持生成 `co-iterations`

> `co-iteration`结构指在两个稀疏向量的交集/并集做迭代，但具体的介绍在论文中并没有提及，暂时不清楚这应该是一个什么样的问题

## `Stage III`

此阶段是我们的目标`IR`: `TensorIR`，在`2`阶段中我们依然保留了`axes` 和 `sparse buffers`这些数据结构，而`3`阶段中我们需要把它们全部改写成普通的 `buffer`，删去所有的稀疏抽象。

这里我们通过 `Sparse Buffer Lowering` 方法来解决：

利用 `indptr` 信息，计算出在一维连续储存下的`offset`，举例而言，$A[i, j]$ 会被翻译为 $A[J\_indptr[i] + j]$，于是，所有的 `sparse buffers` 都能被扁平化为一维向量的形式，如下图所示：

![image-20230609150326573](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230609150326573.png)

比如，二阶段中的

```python
with T.init():
	C[vi, vbi, vf] = T.float32(0)
```

会被翻译为：

```python
with T.init():
	C_data[vi * (blk * feat_size) + vbi * feat_size + vf] = T.float32(0)
```

`C` 被改写为了一维向量，而对这些 `buffer` 的访问规则也进行了相应的改写，第`3`阶段的`IR`是完全的`TensorIR`，可以直接使用`TVM`的编译栈生成后端代码。

## `TVM` 后端上的变化

由于在格式分解之后我们会生成许多在这些小矩阵上的算子，对于 `CUDA` 后端，启动这些 `kernel` 会有一定的开销，因此我们在 `TVM` 的加入了`Horizontal Fusion`作为后处理，把这些小矩阵上的算子融合到同一个算子中，例如下图所示：

![image-20230609151348644](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230609151348644.png)

> 图源自论文原作者

# 源码解析

在之前提到，`SparseTIR` 是 `TIR` 的一个稀疏化版本，以 `TIR` 为基础发展而来的，因此我们只需要在 `TIR` 版本上看 `SparseTIR` 的改进即可。

并且 `SparseTIR` 的工作重点在数据的表示与处理上，所以这里就从`data structure` -> `pass` -> `schedule` 来解读源码

在 `sparsetir/python/tvm/script/tir/__init__.pyi` 中列出了 `sparse` 增加的数据结构与函数

```python
"""
sparse
"""

class Axis: ...

def dense_fixed(length: PrimExpr, idtype: str = "int32"): ...
def dense_variable(
    parent_axis: Axis,
    sizes: Tuple[Union[PrimExpr, int], Union[PrimExpr, int]],
    data: Var,
    idtype: str = "int32",
): ...
def sparse_fixed(
    parent_axis: Axis,
    sizes: Tuple[Union[PrimExpr, int], Union[PrimExpr, int]],
    data: Var,
    idtype: str = "int32",
): ...
def sparse_variable(
    parent_axis: Axis,
    sizes: Tuple[Union[PrimExpr, int], Union[PrimExpr, int]],
    data: Tuple[Var, Var],
    idtype: str = "int32",
): ...
def match_sparse_buffer(data: Var, axes: Sequence[Axis], dtype: str = "float32"): ...
def alloc_sparse_buffer(axes: Sequence[Axis], dtype: str, scope: str = "float32"): ...
def assume_buffer_domain(buf: Buffer, dom: Tuple[PrimExpr, PrimExpr]): ...

class iter(ContextManager):
    def __init__(
        self, axes: Sequence[Axis], iter_types: str, name_hint: str = ""
    ) -> None: ...
    def __enter__(self) -> Sequence[IterVar]: ...
```

## 数据结构

### `Axis`

在之前提到过，这是一个迭代器，其实现如下：

```python
@tvm._ffi.register_object("tir.sparse.Axis")
class Axis(Object):
    name: str
    parent: Optional["Axis"]
    length: PrimExpr
    nnz: PrimExpr
    nnz_cols: Optional[PrimExpr]
    indptr: Optional[Var]
    indices: Optional[Var]
    idtype: str
    sorted: bool

    def __init__(
        self, name, parent, length, nnz, nnz_cols, indptr, indices, idtype, sorted
    ) -> None:
        self.__init_handle_by_constructor__(_ffi_api.Axis, name, parent, length, nnz, nnz_cols, indptr, indices, idtype, sorted)  # type: ignore


```

这里向 `tvm` 框架中注册了一个 `Object` 类，其名称为 `Axis`

注意这里的 `PrimExpr` 实际上是一个 `Node` 类，称为源语表达式，用于调度时的分析等，而 `Node` 的定义如下：

```python
class Node(Object):
    """Base class of all IR Nodes, implements astext function."""

    def astext(self, show_meta_data=True, annotate=None):
        return _ffi_api.AsText(self, show_meta_data, annotate)

    def __str__(self):
        return _ffi_api.PrettyPrint(self)
```

而 `Var` 是可以看作是一个迭代器类，定义如下

```python
@tvm._ffi.register_object("tir.Var")
class Var(PrimExprWithOp):
    def __init__(self, name: str, dtype: Union[str, ir.Type], span: Optional[Span] = None):
        self.__init_handle_by_constructor__(_ffi_api.Var, name, dtype, span)  # type: ignore
```

`Axis` 具体的参数解释如下：

1. `name` : `Axis` 的名称
2. `parent` : `Axis` 的父节点
3. ` length` : 当前 `Axis` 的长度上界
4. `nnz` : 从根节点（最初的 `Axis` ）到当前 `Axis` 的非零元素的累计数量
5. `nnz_cols` : 当前行非零列数，仅对固定轴有效
6. `indptr` : 索引指针
7. `indices` : 非零元素的索引
8. `idtype` : 索引的数据类型（可以是 `int32` ， `float16` 等）
9. `sorted` : 索引是否能被排序

### 矩阵声明

矩阵分为四种：

- 稠密定长
- 稠密变长
- 稀疏定长
- 稀疏变长

1. `dense_fixed_axis` 定义如下：

   ```python
   def dense_fixed_axis(name: str, length: PrimExpr, idtype: str) -> Axis:
       return Axis(name, None, length, length, length, None, None, idtype, True)
   ```

   实际在使用时，我们可以通过如下方式使用：

   ```python
   I = T.dense_fixed(m)
   ```

   其中 `m` 是这里要求的 `length`

   构造的映射通过下面来实现：

   ```python
   @register
   class DenseFixed(SpecialStmt):
       """Special Stmt for creating dense fixed axis."""

       def __init__(self):
           def dense_fixed(length: PrimExpr, idtype: str = "int32", span: Optional[Span] = None):
               names = [x.id.name for x in self.node.lhs]
               if len(names) != 1:
                   self.context.report_error(
                       f"`dense_fixed` expected assign to only one var, but got {names}", span
                   )

               axis = dense_fixed_axis(names[0], length, idtype)
               self.context.func_sp_axes.append(axis)
               self.context.update_symbol(names[0], axis, self.node)

           super().__init__(dense_fixed, def_symbol=True)
   ```

2. `dense_variable_axis` 定义如下

   ```python
   def dense_variable_axis(
       name: str, parent: Axis, length: PrimExpr, nnz: PrimExpr, indptr: Var, idtype: str
   ) -> Axis:
       return Axis(name, parent, length, nnz, None, indptr, None, idtype, True)
   ```

   应用时如下：

   ```python
   J2 = T.dense_variable(I, n, indptr_2, idtype="int32")
   ```

   这里 `(I, J2)`构成了第一维连续，第二维也连续但是不定长的迭代空间，第一维的长度为 `n` ，第二位的最大长度也为 `n`

   同样，映射的类实现如下：

   ```python
   @register
   class DenseVariable(SpecialStmt):
       """Special Stmt for creating dense variable axis."""

       def __init__(self):
           def dense_variable(
               parent_axis: Axis,
               shape: Tuple[PrimExpr, PrimExpr],
               indptr_var: Var,
               idtype: str = "int32",
               span: Optional[Span] = None,
           ):
               names = [x.id.name for x in self.node.lhs]
               if len(names) != 1:
                   self.context.report_error(
                       f"`dense_variable` expected assign to only one var, but got {names}", span
                   )

               length, nnz = shape
               axis = dense_variable_axis(names[0], parent_axis, length, nnz, indptr_var, idtype)
               self.context.func_sp_axes.append(axis)
               self.context.update_symbol(names[0], axis, self.node)

           super().__init__(dense_variable, def_symbol=True)
   ```

   > 这里的 `nnz` 可以为 `None`

3. `sparse_fixed_axis`

   ```python
   def sparse_fixed_axis(
       name: str,
       parent: Axis,
       length: PrimExpr,
       nnz_cols: PrimExpr,
       indices: Var,
       idtype: str,
       sorted: bool = True,
   ) -> Axis:
       return Axis(
           name, parent, length, parent.nnz * nnz_cols, nnz_cols, None, indices, idtype, sorted
       )


   @register
   class SparseFixed(SpecialStmt):
       """Special Stmt for creating sparse fixed axis."""

       def __init__(self):
           def sparse_fixed(
               parent_axis: Axis,
               shape: Tuple[PrimExpr, PrimExpr],
               indices_var: Var,
               idtype: str = "int32",
               sorted: bool = True,
               span: Optional[Span] = None,
           ):
               names = [x.id.name for x in self.node.lhs]
               if len(names) != 1:
                   self.context.report_error(
                       f"`sparse_fixed` expected assign to only one var, but got {names}", span
                   )

               length, nnz_cols = shape
               axis = sparse_fixed_axis(
                   names[0], parent_axis, length, nnz_cols, indices_var, idtype, sorted=sorted
               )
               self.context.func_sp_axes.append(axis)
               self.context.update_symbol(names[0], axis, self.node)

           super().__init__(sparse_fixed, def_symbol=True)
   ```

   具体使用如下：

   ```python
   J1 = T.sparse_fixed(I, (n, c), indices_1, idtype="int32")
   ```

   注意这里，我们同时指定了 `length` 与 `nnz` 的值

4. `sparse_variable_axis`

   ```python
   def sparse_variable_axis(
       name: str,
       parent: Axis,
       length: PrimExpr,
       nnz: PrimExpr,
       indptr: Var,
       indices: Var,
       idtype: str,
       sorted: bool = True,
   ) -> Axis:
       return Axis(name, parent, length, nnz, None, indptr, indices, idtype, sorted)

   @register
   class SparseVariable(SpecialStmt):

       def __init__(self):
           def sparse_variable(
               parent_axis: Axis,
               shape: Tuple[PrimExpr, PrimExpr],
               data: Tuple[Var, Var],
               idtype: str = "int32",
               sorted: bool = True,
               span: Optional[Span] = None,
           ):
               names = [x.id.name for x in self.node.lhs]
               if len(names) != 1:
                   self.context.report_error(
                       f"`sparse_variable` expected assign to only one var, but got {names}", span
                   )

               length, nnz = shape
               indptr_var, indices_var = data
               axis = sparse_variable_axis(
                   names[0], parent_axis, length, nnz, indptr_var, indices_var, idtype, sorted=sorted
               )
               self.context.func_sp_axes.append(axis)
               self.context.update_symbol(names[0], axis, self.node)

           super().__init__(sparse_variable, def_symbol=True)
   ```

   具体使用如下：

   ```python
   J3 = T.sparse_variable(J1, (n1, nnz), (indptr_3, indices_3), idtype="int64")
   ```

   在这里我们还指定了 `indices` 的值

以上就是基础的数据结构的定义，需要注意的是，这里实际上还是抽象，真正底层的实现是使用 `tvm` 中的 `Array`

> 对于 `Buffer` 部分 `python` 部分只有定义，完整的实现在 `cpp` 中 `src/tir/transforms/lower_sparse_buffer.cc`，在此实现中，会将声明和 `match_sparse_buffer `降低到 `match_buffers`，然后通过 `lower_match_buffer.cc` 中的实现，将指针与 `buffer` 绑定在一起
>
> 当然，如果作用域不是全局，那么其储存位置在 `shared memory` 上，属于临时分配的 `buffer`，不需要与指针进行绑定

## 编译

在之前提到，`SparseTIR` 的目标是转化为 `TensorIR` ，但是为实现可组合格式与可组合变换，他加入了两个 `pass` 来完成这一点：

1. `DecomposeFormat` 目的是把计算分解到更小的结构化稀疏矩阵，最后进行空间坐标计算
2. `Sparse Iteration Lowering` 目的是将空间坐标转换为位置坐标，进行稀疏结构的压缩/解压

下面对三个阶段进行阐述，详细解读这两个 `pass` 的做法

### `Stage I`

考虑 `DecomposeFormat`，其需要传递一个 `FormatRewriteRule` 类的参数，此类的定义如下：

```python
@tvm._ffi.register_object("tir.sparse.FormatRewriteRule")
class FormatRewriteRule(Object):

    def __init__(
        self,
        name: str,
        new_format_desc: tvm.tir.PrimFunc,
        buffers_to_rewrite: List[str],
        axes_before_rewrite: List[str],
        axes_after_rewrite: List[str],
        axis_map: Dict[str, List[str]],
        idx_map: Union[Callable, IndexMap],
        inv_idx_map: Union[Callable, IndexMap],
    ) -> None:
        if isinstance(idx_map, Callable):
            idx_map = IndexMap.from_func(idx_map)
        if isinstance(inv_idx_map, Callable):
            inv_idx_map = IndexMap.from_func(inv_idx_map)
        self.__init_handle_by_constructor__(
            _ffi_api.FormatRewriteRule,
            name,
            new_format_desc,
            buffers_to_rewrite,
            axes_before_rewrite,
            axes_after_rewrite,
            axis_map,
            idx_map,
            inv_idx_map,
        )  # type: ignore
```

实际上需要传递的就是：

1. 重写方法的名称
2. 新矩阵的存储格式
3. 需要被重写的缓冲区
4. 重写前的迭代器
5. 重写后生成的迭代器
6. 重写前后迭代器的映射方式
7. 格式的映射方式

示例如下：

```python
FormatRewriteRule(
    0 + "_" + 1,
    ell.specialize({nnz_cols_symbol: bucket_size}),
    ["A"],
    ["I", "J"],
    ["O", "I", "J"],
    {"I": ["O", "I"], "J": ["J"]},
    csr2ell_index_map,
    csr2ell_inv_index_map,
)
```

其中 `ell.specialize` 是一个脚本序列化参数的方法，通过将缺少的参数填入来完成一个脚本函数的生成，比如上面，就会将 `bucket_size` 的值填入所有 `nnz_cols_symbol` 占用的位置

最后的是两个 `csr2ell` 的索引映射方式（索引包括 `indices` 与 `indptr`）

> 这里提供了很强的自定义性，用户可以设计自己的矩阵存储格式，只需要重写索引的映射规则，那么就可以进行转化

传入这个自定义的参数后，执行

```python
mod = tvm.IRModule.from_expr(csrmm)
mod = format_decompose(mod, rewrites)
```

注意这里的 `mod` 是一个 `Tensor IR` 模块，通过传入这个参数，进行矩阵格式的重组。

此 `pass` 的实现在 `src/tir/transforms/sparse_format_decompose.cc` 中

定义如下：

```cpp
Pass SparseFormatDecompose(Array<FormatRewriteRule> composable_formats,
                           bool include_format_rewrite_blks) {
  auto pass_func = [=](PrimFunc f, IRModule m, PassContext ctx) {
    return SparseFormatDecompose(std::move(composable_formats), std::move(f),
                                 include_format_rewrite_blks);
  };
  return CreatePrimFuncPass(pass_func, 0, "tir.SparseFormatDecompose", {});
}
```

对照 `python` 中的接口：

```python
def format_decompose(
    mod: IRModule,
    composable_formats: List["FormatRewriteRule"],
    include_format_rewrite_blks: bool = True,
):
    """Rewrite the sparse format of sparse buffers in the TIR scripts.

    Parameters
    ----------
    mod : IRModule
        The IRModule to lower.
    composable_formats : List[FormatRewriteRule]
        Composable formats is a list of rewrite rules.
    include_format_rewrite_blks : bool
        Whether to include format rewrite blocks in the output.
    """
    if not isinstance(mod, IRModule):
        raise TypeError("Expected IRModule, but got {}".format(type(mod)))
    return SparseFormatDecompose(composable_formats, include_format_rewrite_blks)(mod)
```

实际上就是返回生成的 `IR` ，这里我们考虑 `lambda` 函数 `pass_func` 中的 `SparseFormatDecompose` :

```cpp
PrimFunc SparseFormxatDecompose(Array<FormatRewriteRule> composable_formats, PrimFunc f,
                                bool include_format_rewrite_blks = true) {
  CHECK(composable_formats.size() >= 1)
      << "The given composable formats length should be greater than or equal to 1.";
  // Only apply this pass to TIR that is not from TE schedules
  if (!IsFromLegacyTESchedule(f) && SparseTIRLevel(f) == 2) {
    // SparseFormatDecomposer rewriter(composable_formats);
    PrimFuncNode* fptr = f.CopyOnWrite();
    Array<PrimFunc> format_descs;
    Array<Axis> old_sp_axes = f->sp_axes;
    Array<SparseBuffer> old_buffers;
    for (const auto& kv : f->buffer_map) {
      old_buffers.push_back(Downcast<SparseBuffer>(kv.second));
    }
    for (const FormatRewriteRule& rule : composable_formats) {
      format_descs.push_back(AddSuffix(rule->new_format_desc, "_" + rule->name));
    }
    fptr->params = UpdateParams(format_descs, f->params);
    fptr->buffer_map = UpdateBufferMap(format_descs, f->buffer_map);
    fptr->sp_axes = UpdateSparseAxes(format_descs, f->sp_axes);
    Array<Stmt> format_rewrite_blks, compute_blks;
    // generate format rewrite blocks and compute blocks for each rule
    for (size_t i = 0; i < composable_formats.size(); ++i) {
      SparseFormatDecomposer rewriter(composable_formats[i], format_descs[i], old_sp_axes,
                                      old_buffers);
      rewriter(f->body);
      for (const Stmt& sp_iter : rewriter.format_rewrites_blks) {
        format_rewrite_blks.push_back(sp_iter);
      }
      for (const Stmt& sp_iter : rewriter.compute_blks) {
        compute_blks.push_back(sp_iter);
      }
    }
    // merge format rewrite and compute blocks.
    Array<Stmt> all_blks;
    if (include_format_rewrite_blks) {
      for (const Stmt& sp_iter : format_rewrite_blks) {
        all_blks.push_back(sp_iter);
      }
    }
    for (const Stmt& sp_iter : compute_blks) {
      all_blks.push_back(sp_iter);
    }
    Stmt new_body = all_blks.size() == 1 ? all_blks[0] : SeqStmt(all_blks);
    fptr->body = BlockRealize({}, const_true(), Block({}, {}, {}, "root", new_body, NullOpt, {}));
    // add composable flag.
    if (composable_formats.size() > 1) {
      Map<String, ObjectRef> new_attr_dict = fptr->attrs->dict;
      new_attr_dict.Set("composable", Integer(1));
      fptr->attrs = DictAttrs(new_attr_dict);
    }
    return f;
  } else {
    return f;
  }
}
```

注意到这里需要判断 `SparseTIRLevel` 是否为 `2`，防止 `lowering` 错误

> 主要是因为 `SparseTIR` 提供了与 `TIR` 相互转化的功能

这里返回的 `f` 就是分解完矩阵后的 `IR`了，在这之后，消除多余的缓冲区即可：

```python
def RemovePreprocess():
    # Remove the preprocess blocks/sparse iterations in the module.

    return _ffi_api.RemovePreprocess()  # type: ignore
```

其 `C++` 实现为：

```cpp
PrimFunc RemovePreprocess(PrimFunc f) {
  if (!IsFromLegacyTESchedule(f)) {
    PrimFuncNode* fptr = f.CopyOnWrite();
    PreprocessRemover remover;
    fptr->body = remover(fptr->body);
    // insert extra parameters
    for (const Var& var : remover.extra_buffer_vars) {
      fptr->params.push_back(var);
      ICHECK(remover.extra_buffer_map.count(var))
          << "Internal error, extra_buffer_map do not have key " << var;
      fptr->buffer_map.Set(var, remover.extra_buffer_map.Get(var).value());
    }
    return f;
  } else {
    return f;
  }
}

Pass RemovePreprocess() {
  auto pass_func = [=](PrimFunc f, IRModule m, PassContext ctx) {
    return RemovePreprocess(std::move(f));
  };
  return CreatePrimFuncPass(pass_func, 0, "tir.RemovePreprocess", {});
}
```

这里就完成了分解后的迭代与计算规则重写，最后返回 `IR`

接着，我们需要进行调度，在这一阶段支持的调度只有 `reorder` 与 `fuse` ，其接口如下：

```python
    def sparse_reorder(self, block: SparseIterationRV, new_order: List[SpIterVar]) -> None:
        _ffi_api.ScheduleSparseReorder(  # type: ignore # pylint: disable=no-member
            self,
            block,
            new_order,
        )

    def sparse_fuse(self, block: SparseIterationRV, iters_to_fuse: List[SpIterVar]) -> None:
        _ffi_api.ScheduleSparseFuse(  # type: ignore # pylint: disable=no-member
            self,
            block,
            iters_to_fuse,
        )
```

我们可以通过下面的方法来使用(`mod`为`IR`)：

```python
sch = tir.Schedule(mod)
sp_iteration = sch.get_sparse_iteration("sddmm")
i, j, k = sch.get_sp_iters(sp_iteration)
sch.sparse_reorder(sp_iteration, [k, i, j])
sch.sparse_fuse(sp_iteration, [i, j])
```

而其具体实现为：

```cpp
SparseIteration SparseReorder(ScheduleState self, const SparseIteration& sp_iteration,
                              const Array<SpIterVar>& new_order) {
  // Step 1. Check whether the iterators in `new_order` are the same as `sp_iteration`'s iterators.
  CheckValidInputIterators(self, new_order, sp_iteration->sp_iter_vars);

  // Step 2. Check whether the new order does not break the iterator dependency.
  CheckDependency(self, new_order);

  // Step 3. Create the new SparseIteration.
  ObjectPtr<SparseIterationNode> p_new_sp_iteration =
      make_object<SparseIterationNode>(*sp_iteration.get());
  p_new_sp_iteration->sp_iter_vars = new_order;
  SparseIteration new_sp_iteration(p_new_sp_iteration);

  UpdateIRModule(self, sp_iteration, new_sp_iteration);
  return new_sp_iteration;
}

SparseIteration SparseFuse(ScheduleState self, const SparseIteration& sp_iteration,
                           const Array<SpIterVar>& iters_to_fuse) {
  // Step 1. Check match or not.
  int match_pos = CheckFuseMatch(self, iters_to_fuse, sp_iteration->sp_iter_vars);

  ObjectPtr<SparseIterationNode> p_new_sp_iteration =
      make_object<SparseIterationNode>(*sp_iteration.get());
  Array<SpIterVar> new_sp_iters;
  for (int i = 0; i < match_pos; ++i) {
    new_sp_iters.push_back(sp_iteration->sp_iter_vars[i]);
  }
  Array<Axis> axis_group;
  for (const SpIterVar& sp_iter_var : iters_to_fuse) {
    axis_group.push_back(sp_iter_var->axis);
  }
  for (size_t i = 0; i < iters_to_fuse.size(); ++i) {
    const SpIterVar& sp_iter_var = iters_to_fuse[i];
    Axis new_axis = FusedAxis(axis_group, i);
    new_sp_iters.push_back(SpIterVar(sp_iter_var->var, sp_iter_var->is_reduction, new_axis));
  }
  for (size_t i = match_pos + iters_to_fuse.size(); i < sp_iteration->sp_iter_vars.size(); ++i) {
    new_sp_iters.push_back(sp_iteration->sp_iter_vars[i]);
  }
  p_new_sp_iteration->sp_iter_vars = new_sp_iters;
  SparseIteration new_sp_iteration(p_new_sp_iteration);

  UpdateIRModule(self, sp_iteration, new_sp_iteration);
  return new_sp_iteration;
}
```

较为复杂的是 `fuse` 的实现，这里根据 `fuse` 规则，重写了循环迭代，并且生成了新的 `Axis` 来适应新的循环迭代器

### `Stage II`

在这一步，我们需要将 `SparseTIR` 的迭代重写为 `TIR` 的迭代形式

因此，在这里加入了一次 `lowering`：

```python
def lower_sparse_iter(mod: IRModule, check_invalid_binary_search: bool = False):
    """Lower sparse iterators in Sparse TIR.
    """

    if not isinstance(mod, IRModule):
        raise TypeError("Expected IRModule, but got {}".format(type(mod)))
    return LowerSparseIter(check_invalid_binary_search)(mod)
```

其 `C++` 实现为：

```cpp
PrimFunc LowerSparseIter(PrimFunc f, bool check_invalid_binary_search) {
  // Only apply this pass to TIR that is not from TE schedules
  if (!IsFromLegacyTESchedule(f) && SparseTIRLevel(f) == 2) {
    PrimFuncNode* fptr = f.CopyOnWrite();
    // Step 1. Update the PrimFunc's buffer map.
    Map<Axis, SparseBuffer> axis_indptr_map, axis_indices_map;
    Array<BufferDomain> buf_doms;
    std::tie(axis_indptr_map, axis_indices_map, fptr->buffer_map, fptr->sp_axes, buf_doms) =
        UpdateMetadata(f);
    // Step 2. Lower iterations.
    IterTransformer lower_sparse(axis_indptr_map, axis_indices_map, fptr->sp_axes,
                                 check_invalid_binary_search);
    Stmt body = lower_sparse(std::move(fptr->body));
    // Step 3. Wrap with root block, insert bsearch blocks and allocated buffers.
    if (!lower_sparse.bsearch_structures.empty()) {
      Array<Stmt> seq;
      for (const auto& bsearch_struct : lower_sparse.bsearch_structures) {
        seq.push_back(bsearch_struct.body);
      }
      seq.push_back(body);
      body = SeqStmt(seq);
    }
    buf_doms = Concat(buf_doms, lower_sparse.alloc_buf_doms);
    Block root_block({}, {}, {}, "root", body, NullOpt, lower_sparse.root_alloc_buffers, {},
                     buf_doms);
    fptr->body = BlockRealize({}, const_true(), std::move(root_block));
    // Step 4. Lower sparse tir level.
    Map<String, ObjectRef> new_attr_dict = fptr->attrs->dict;
    new_attr_dict.Set("sparse_tir_level", Integer(1));
    fptr->attrs = DictAttrs(new_attr_dict);
    // Step 5. postprocess bufferload with possible invalid indices
    if (check_invalid_binary_search) {
      fptr->body = InvalidIndicesPostProcess()(std::move(fptr->body));
    }
    return f;
  } else {
    return f;
  }
}

Pass LowerSparseIter(bool check_invalid_binary_search) {
  auto pass_func = [=](PrimFunc f, IRModule m, PassContext ctx) {
    return LowerSparseIter(std::move(f), check_invalid_binary_search);
  };
  return CreatePrimFuncPass(pass_func, 0, "tir.LowerSparseIter", {});
}
```

此函数的流程与 [Stage II](#`Stage II`) 中描述的一致：

1. 更新缓冲区的映射，包括建立辅助缓冲区等
2. 将循环进行展开
3. 在展开的循环中插入 `block` 进行包装
4. 完成空间坐标到位置坐标的计算映射

生成符合 `TIR` 一样拥有块结构的迭代后，我们进入这一阶段的调度，而这里的调度我们可以直接使用 `TIR` 中的调度源语，而不需要自己再去实现 `SparseTIR` 的调度源语了（因为迭代结构一致）

举例如下：

```python
sch = tir.Schedule(mod_preprocess)
blk = sch.get_block("binary_search_block_0_0")
(i,) = sch.get_loops(blk)
io, ii = sch.split(i, [None, 32])
sch.bind(ii, "threadIdx.x")
sch.bind(io, "blockIdx.x")
```

显然，这里的调度源语都是 `TIR` 中已经实现的内容

### `Stage III`

在这一步，所做的就是把 `buffer` 与 `axis` `lowering` 到 `TIR` 的级别上，我们具体的使用如下：

```python
mod = lower_sparse_buffer(sch.mod)
```

这样，得到的 `mod` 就是一个 `TIR` 级别的 `IR` 了

其具体做法如下：

```cpp
PrimFunc LowerSparseBuffer(PrimFunc f) {
  // Only apply this pass to TIR that is not from TE schedules
  if (!IsFromLegacyTESchedule(f) && SparseTIRLevel(f) == 1) {
    bool is_horizontal_fuse = f->HasNonzeroAttr("horizontal_fuse");
    PrimFuncNode* fptr = f.CopyOnWrite();
    // Step 1. Update the PrimFunc's buffer map.
    fptr->buffer_map = std::move(UpdateBufferMap(f));
    // Step 2. Lower sparse buffers.
    fptr->body = BufferTransformer(fptr->sp_axes, fptr->buffer_map,
                                   is_horizontal_fuse)(std::move(fptr->body));
    // Step 3. Remove sparse axes
    fptr->sp_axes.clear();
    // Step 4. Lower sparse tir level
    Map<String, ObjectRef> new_attr_dict = fptr->attrs->dict;
    new_attr_dict.Set("sparse_tir_level", Integer(0));
    fptr->attrs = DictAttrs(new_attr_dict);
    return f;
  } else {
    return f;
  }
}

namespace transform {

/*!
 * \brief The lowering pass from TIR to Sparse TIR.
 */
Pass LowerSparseBuffer() {
  auto pass_func = [=](PrimFunc f, IRModule m, PassContext ctx) {
    return LowerSparseBuffer(std::move(f));
  };
  return CreatePrimFuncPass(pass_func, 0, "tir.LowerSparseBuffer", {});
}
```

注意到这里的 `SparseTIRlevel` 已经降为 `1` ，这是因为在 `Stage II` 中，我们降低了其调度这一级别到 `TIR` 抽象

所以在这里，我们需要做的就是把 `Sparse Buffer` 与 `Axis` 抽象全都删去，将矩阵乘转变为通过 `offset` 完成的向量乘（也就是说通过偏移量来计算最后的结果），因此这一步实际上就是在计算 `offset`

完成这一步后，我们就到了 `TIR` 级别的抽象，相当于我们已经进入了 `TVM` ，直接使用 `TVM` 的 `build` 即可：

```python
f = tvm.build(mod, target="cuda")
```

然后调用函数运行：

```python
evaluator = f.time_evaluator(f.entry_name, tvm.cuda(0), number=100)
```

# 复现

> 经作者指出，AE 的所有代码与实验（baseline 等）均在已 [开源](https://github.com/uwsampl/sparsetir-artifact) 中。
> 此部分在论文的附录 `B.3 Description` 中提及

在 `example` 中给出了如何使用 `SparseTIR` 的示例，如 `spmm` :

```python
import dgl
import tvm
import tvm.testing
import tvm.tir as tir
import scipy.sparse as sp
import argparse
import numpy as np
import torch as th
from tvm.script import tir as T
from tvm.sparse import (
    FormatRewriteRule,
    lower_sparse_buffer,
    lower_sparse_iter,
    column_part_hyb,
    format_decompose,
)
import tvm.sparse
from utils import get_dataset, ell


@T.prim_func
def csrmm(
    a: T.handle,
    b: T.handle,
    c: T.handle,
    indptr: T.handle,
    indices: T.handle,
    m: T.int32,
    n: T.int32,
    num_tiles: T.int32,
    nnz: T.int32,
    cwm: T.int32,
) -> None:
    T.func_attr({"global_symbol": "main", "tir.noalias": True, "sparse_tir_level": 2})
    I = T.dense_fixed(m)
    J = T.sparse_variable(I, (n, nnz), (indptr, indices), "int32")
    J_detach = T.dense_fixed(n)
    K1 = T.dense_fixed(num_tiles)
    K2 = T.dense_fixed(cwm)
    K3 = T.dense_fixed(32)
    A = T.match_sparse_buffer(a, (I, J), "float32")
    B = T.match_sparse_buffer(b, (J_detach, K1, K2, K3), "float32")
    C = T.match_sparse_buffer(c, (I, K1, K2, K3), "float32")
    with T.sp_iter([I, J, K1, K2, K3], "SRSSS", "csrmm") as [i, j, k1, k2, k3]:
        with T.init():
            C[i, k1, k2, k3] = 0.0
        C[i, k1, k2, k3] = C[i, k1, k2, k3] + A[i, j] * B[j, k1, k2, k3]


class TorchOpTimer(object):
    def __enter__(self):
        self.start_event = th.cuda.Event(enable_timing=True)
        self.end_event = th.cuda.Event(enable_timing=True)
        self.start_event.record()
        return self

    def __exit__(self, type, value, traceback):
        self.end_event.record()
        th.cuda.synchronize()  # Wait for the events to be recorded!
        self.time = self.start_event.elapsed_time(self.end_event) / 1e3


def csr2ell_inv_index_map(o, i, j):
    return i, j


def csr2ell_index_map(i, j):
    return 0, i, j


cached_bucketing_format = None


def bench_hyb(
    g,
    x,
    y_golden,
    feat_size=128,
    bucket_sizes=[],
    coersening_factor=2,
    num_col_parts=1,
    use_implicit_unroll=False,
):
    num_buckets = len(bucket_sizes)
    coersening_factor = min(coersening_factor, feat_size // 32)
    indptr, indices, _ = g.adj_sparse("csc")
    m = g.num_dst_nodes()
    n = g.num_src_nodes()
    nnz = g.num_edges()
    global cached_bucketing_format
    if cached_bucketing_format is None:
        indptr_nd = tvm.nd.array(indptr.numpy(), device=tvm.cpu())
        indices_nd = tvm.nd.array(indices.numpy(), device=tvm.cpu())
        cached_bucketing_format = column_part_hyb(
            m, n, indptr_nd, indices_nd, num_col_parts, bucket_sizes
        )
    row_indices, col_indices, mask = cached_bucketing_format

    # rewrite csrmm
    nnz_cols_symbol = ell.params[-1]
    rewrites = []
    for part_id in range(num_col_parts):
        for bucket_id, bucket_size in enumerate(bucket_sizes):
            rewrites.append(
                FormatRewriteRule(
                    str(part_id) + "_" + str(bucket_id),
                    ell.specialize({nnz_cols_symbol: bucket_size}),
                    ["A"],
                    ["I", "J"],
                    ["O", "I", "J"],
                    {"I": ["O", "I"], "J": ["J"]},
                    csr2ell_index_map,
                    csr2ell_inv_index_map,
                )
            )
    mod = tvm.IRModule.from_expr(csrmm)
    mod = format_decompose(mod, rewrites)
    mod = tvm.tir.transform.RemovePreprocess()(mod)

    # specialize
    params = mod["main"].params
    param_map = {
        params[5]: m,  # m
        params[6]: n,  # n
        params[7]: feat_size // coersening_factor // 32,  # num_tiles,
        params[8]: nnz,  # nnz
        params[9]: coersening_factor,  # coersening_factor
    }
    for part_id in range(num_col_parts):
        for bucket_id in range(num_buckets):
            param_map[params[10 + 7 * (part_id * num_buckets + bucket_id) + 4]] = m
            param_map[params[10 + 7 * (part_id * num_buckets + bucket_id) + 5]] = n
            param_map[params[10 + 7 * (part_id * num_buckets + bucket_id) + 6]] = row_indices[
                part_id
            ][bucket_id].shape[0]

    mod["main"] = mod["main"].specialize(param_map).with_attr("horizontal_fuse", True)

    # schedule
    sch = tvm.tir.Schedule(mod)
    for sp_iter_name in [
        "csrmm_{}_{}".format(i, j) for j in range(num_buckets) for i in range(num_col_parts)
    ]:
        sp_iteration = sch.get_sparse_iteration(sp_iter_name)
        o, i, j, k1, k2, k3 = sch.get_sp_iters(sp_iteration)
        sch.sparse_fuse(sp_iteration, [o, i])

    mod = sch.mod
    mod = tvm.sparse.lower_sparse_iter(mod)
    sch = tvm.tir.Schedule(mod)
    for part_id in range(num_col_parts):
        for bucket_id, bucket_size in enumerate(bucket_sizes):
            is_atomic = num_col_parts > 1 or bucket_id + 1 == num_buckets
            blk = sch.get_block("csrmm_{}_{}0".format(part_id, bucket_id))
            i, j, foo, foi, fi = sch.get_loops(blk)
            sch.reorder(foo, fi, j, foi)
            if is_atomic:
                sch.annotate(blk, "atomic", True)
                write_blk = sch.reverse_cache_write(blk, 0, "local")
                sch.reverse_compute_at(write_blk, fi, True)
                # sch.unroll(sch.get_loops(write_blk)[-2])
            sch.bind(fi, "threadIdx.x")
            sch.bind(foo, "blockIdx.y")
            sch.unroll(foi)
            if use_implicit_unroll:
                sch.annotate(foi, "pragma_unroll_explicit", 0)
            sch.unroll(j)
            if use_implicit_unroll:
                sch.annotate(j, "pragma_unroll_explicit", 0)
            io, ioi, ii = sch.split(i, [None, bucket_sizes[-1] // bucket_size, 8])
            sch.bind(io, "blockIdx.x")
            sch.bind(ii, "threadIdx.y")
            init_blk = sch.decompose_reduction(blk, fi)
            ax0, ax1 = sch.get_loops(init_blk)[-2:]
            sch.bind(ax0, "threadIdx.x")
            sch.unroll(ax1)
            if use_implicit_unroll:
                sch.annotate(ax1, "pragma_unroll_explicit", 0)

    mod = tvm.sparse.lower_sparse_buffer(sch.mod)
    mod = tvm.tir.transform.RemoveUnusedArgs()(mod)
    f = tvm.build(mod, target="cuda")

    # prepare nd array
    b_nd = tvm.nd.array(
        x.numpy().reshape(-1).astype("float32"),
        device=tvm.cuda(0),
    )
    c_nd = tvm.nd.array(np.zeros((n * feat_size,)).astype("float32"), device=tvm.cuda(0))
    # prepare args
    args = [b_nd, c_nd]

    for part_id in range(num_col_parts):
        for bucket_id, _ in enumerate(bucket_sizes):
            weight = tvm.nd.array(
                mask[part_id][bucket_id].numpy().reshape(-1).astype("float32"), device=tvm.cuda(0)
            )
            rows = tvm.nd.array(
                row_indices[part_id][bucket_id].numpy().astype("int32"), device=tvm.cuda(0)
            )
            cols = tvm.nd.array(
                col_indices[part_id][bucket_id].numpy().reshape(-1).astype("int32"),
                device=tvm.cuda(0),
            )
            args += [weight, rows, cols]

    # test accuracy
    f(*args)
    tvm.testing.assert_allclose(c_nd.numpy().reshape(-1, feat_size), y_golden.numpy(), rtol=1e-4)

    # evaluate time
    evaluator = f.time_evaluator(f.entry_name, tvm.cuda(0), number=100)
    print("tir hyb time: {:.5f}ms".format(evaluator(*args).mean * 1000))


col_part_config = {
    "arxiv": 1,
    "proteins": 8,
    "pubmed": 1,
    "citeseer": 1,
    "cora": 1,
    "ppi": 16,
    "reddit": 8,
    "products": 16,
}

bucketing_config = {
    "arxiv": [1, 2, 4, 8, 16, 32],
    "proteins": [1, 2, 4, 8, 16, 32, 64, 128, 256],
    "pubmed": [1, 2, 4, 8, 16, 32],
    "citeseer": [1, 2, 4],
    "cora": [1, 2, 4],
    "ppi": [1, 2, 4, 8, 16, 32],
    "products": [1, 2, 4, 8, 16, 32],
    "reddit": [1, 2, 4, 8, 16, 32, 64, 128, 256, 512],
}


if __name__ == "__main__":
    parser = argparse.ArgumentParser("hybrid format spmm in sparse-tir")
    parser.add_argument("--dataset", "-d", type=str, default="arxiv", help="dataset name")
    parser.add_argument("--implicit-unroll", "-i", action="store_true", help="use implicit unroll")
    args = parser.parse_args()
    name = args.dataset
    g = get_dataset(name)

    for feat_size in [32, 64, 128, 256, 512]:
        print("feat_size =", feat_size)
        x = th.rand((g.num_src_nodes(), feat_size))
        y_golden = dgl.ops.copy_u_sum(g, x)
        bench_hyb(
            g,
            x,
            y_golden,
            feat_size=feat_size,
            bucket_sizes=bucketing_config[name],
            coersening_factor=2,
            num_col_parts=col_part_config[name],
            use_implicit_unroll=args.implicit_unroll,
        )

```

## `SpMM`

![image-20230618215447269](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230618215447269.png)

在 `RTX 3090Ti` 上复现 `SparseTIR(no-hyb)` 与 `SparseTIR(hyb)` 的结果如图：

![image-20230618222247090](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230618222247090.png)

## `SDDMM`

![image-20230618222259723](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230618222259723.png)

在 `RTX 3090Ti` 上复现 `dgl` 与 `SparseTIR(hyb)` 的结果如图：

![image-20230618222627906](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230618222627906.png)
