---
title: SparseTIR & SparTA 环境搭建与实现复现
description: SparseTIR 与 SparTA 的实验复现
tags:
  - Compiler
  - MLSys
date: 2023-06-12
lastmod: 2024-12-11
draft: false
---

# 环境搭建

由于在官方文档中 `SparseTIR` 环境不能使用 `python 3.8`:

![image-20230612141242994](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230612141242994.png)

并且 `SparTA` 的开源版本根本没做完，想要复现只能用他给定的复现版本

因此这里不能使用最初的 `tvm` 的 `docker`

这里我们利用之前的 `docker image` 重新构建一个 `docker` 进行环境搭建，当然，镜像与 `tvm` 中使用的一致。

## `Docker` 构建

> 由于这两个项目对于 `python` 版本和包依赖会出错，因此需要分开构建 `docker`

`Dockerfile.sparsetir` 如下：

```dockerfile
FROM nvidia/cuda:11.7.0-cudnn8-devel-ubuntu20.04
# Install tools and dependencies.
RUN sed -i 's/archive.ubuntu.com/mirrors.ustc.edu.cn/g' /etc/apt/sources.list
RUN apt-get -y update && apt -y  upgrade
ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai
RUN apt-get install -y \
    vim \
    git \
    wget \
    libgoogle-glog-dev
RUN apt install -y \
    gcc \
    libtinfo-dev \
    zlib1g-dev \
    build-essential \
    libedit-dev \
    libxml2-dev \
    libssl-dev \
    unzip \
    pip \
    libsndfile1

# Setup to install the latest version of cmake.
RUN apt-get install -y software-properties-common && \
    apt-get update && \
    wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc 2>/dev/null | gpg --dearmor - | tee /etc/apt/trusted.gpg.d/kitware.gpg >/dev/null && \
    apt-add-repository 'deb https://apt.kitware.com/ubuntu/ focal main' && \
    apt-get update && apt-get install -y cmake


# Set the working directory.

WORKDIR /root

RUN wget https://repo.anaconda.com/archive/Anaconda3-2023.03-1-Linux-x86_64.sh && \
    bash Anaconda3-2023.03-1-Linux-x86_64.sh -b -p /root/anaconda
RUN eval "$(/root/anaconda/bin/conda shell.bash hook)" && conda create -n tir python=3.9 -y && \
    conda activate tir && pip3 install torch torchvision torchaudio

# install llvm12
RUN wget https://apt.llvm.org/llvm.sh && \
    chmod +x llvm.sh && \
    ./llvm.sh 12

# add github host
RUN echo '20.205.243.166  github.com\n\
    199.59.148.96 github.global.ssl.fastly.Net\n' >> /etc/hosts

# install sparseTIR
RUN git clone --recursive https://github.com/uwsampl/SparseTIR.git sparsetir && cd sparsetir/cmake && \
    echo set\(USE_LLVM ON\) >> config.cmake && \
    echo set\(HIDE_PRIVATE_SYMBOLS ON\) >> config.cmake && \
    echo set\(USE_CUDA ON\) >> config.cmake && \
    echo set\(USE_CUBLAS ON\) >> config.cmake && \
    echo set\(USE_CUDNN ON\) >> config.cmake && \
    echo set\(USE_RELAY_DEBUG ON\) >> config.cmake && \
    cd .. && \
    mkdir -p build && \
    cd build && \
    cp ../cmake/config.cmake . && \
    cmake .. && \
    make -j$(nproc) && \
    pip install decorator && \
    cd .. && \
    export SPARSETIR_PATH=$(pwd) && \
    export PYTHONPATH=${SPARSETIR_PATH}/python:${PYTHONPATH} && \
    eval "$(/root/anaconda/bin/conda shell.bash hook)" && conda activate tir && \
    cd python && python setup.py install  && cd ..

```

输入命令:

```bash
docker build . -f Dockerfile.sparsetir  -t tir
```

进行镜像构建，完成后输入：

```bash
docker system prune
docker run  -p 8088:22 --restart=on-failure --runtime=nvidia  -it tir /bin/bash
```

进入容器

而 `Dockerfile.sparta` 如下：

```dockerfile
# FROM nvidia/cuda:11.0-cudnn8-devel-ubuntu18.04
FROM nvidia/cuda:11.1-cudnn8-devel-ubuntu18.04
# Install tools and dependencies.
ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai
RUN sed -i 's/archive.ubuntu.com/mirrors.ustc.edu.cn/g' /etc/apt/sources.list
RUN apt-get -y update && apt -y  upgrade
RUN apt-get install -y \
    emacs \
    git \
    wget \
    libgoogle-glog-dev \
    libsndfile1

# Setup to install the latest version of cmake.
RUN apt-get install -y software-properties-common && \
    apt-get update && \
    wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc 2>/dev/null | gpg --dearmor - | tee /etc/apt/trusted.gpg.d/kitware.gpg >/dev/null && \
    apt-add-repository 'deb https://apt.kitware.com/ubuntu/ bionic main' && \
    apt-get update && apt-get install -y cmake
# Set the working directory.
WORKDIR /root

#install sputnik
RUN git clone --recurse-submodules https://github.com/zheng-ningxin/sputnik.git && \
    cd sputnik && mkdir build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_TEST=ON -DBUILD_BENCHMARK=ON -DCUDA_ARCHS="70;75" && \
    make -j && cp sputnik/libspmm.so /usr/local/lib/ && cp -r /root/sputnik/third_party/abseil-cpp/absl /usr/local/include/

# install nnfusion
RUN git clone https://github.com/zheng-ningxin/nnfusion.git && cd nnfusion && git checkout hubert_antares && \
    ./maint/script/install_dependency.sh && mkdir build && cd build && cmake .. && make -j

# install anaconda
RUN wget https://repo.anaconda.com/archive/Anaconda3-2021.11-Linux-x86_64.sh && \
    bash Anaconda3-2021.11-Linux-x86_64.sh -b -p /root/anaconda && \
    eval "$(/root/anaconda/bin/conda shell.bash hook)" && conda create -n artifact python=3.8 -y && \
    conda activate artifact && pip install torch==1.7.0 torchvision==0.8.0

# install nni
RUN git clone https://github.com/zheng-ningxin/nni.git && cd nni && git checkout artifact && \
    eval "$(/root/anaconda/bin/conda shell.bash hook)" && conda activate artifact && pip install -U -r dependencies/setup.txt && \
    pip install -r dependencies/develop.txt && python setup.py develop && pip install tensorboard transformers==3.5.0 onnxruntime graphviz onnx soundfile datasets==2.0.0 ply matplotlib numpy librosa

# install antares
RUN eval "$(/root/anaconda/bin/conda shell.bash hook)" && conda activate artifact && \
    pip install antares==0.3.12.1

# install tensorrt
RUN  eval "$(/root/anaconda/bin/conda shell.bash hook)" && conda activate artifact && \
    pip install pycuda==2020.1 && python3 -m pip install --upgrade setuptools pip && \
    python3 -m pip install nvidia-pyindex && python3 -m pip install --upgrade nvidia-tensorrt==8.4.0.6 && \
    pip install six

# install tvm
RUN wget https://github.com/llvm/llvm-project/releases/download/llvmorg-13.0.0/clang+llvm-13.0.0-x86_64-linux-gnu-ubuntu-16.04.tar.xz && \
    tar -xvf clang+llvm-13.0.0-x86_64-linux-gnu-ubuntu-16.04.tar.xz
RUN eval "$(/root/anaconda/bin/conda shell.bash hook)" && conda activate artifact && \
    git clone --recursive https://github.com/linbinskn/tvm.git tvm && cd tvm && git checkout cuda_old && \
    apt-get update && apt-get install -y python3 python3-dev python3-setuptools gcc libtinfo-dev zlib1g-dev build-essential cmake libedit-dev libxml2-dev && \
    cd build && cmake .. && make -j4 &&  \
    pip install decorator

# install taco
RUN export PATH=/usr/local/cuda/bin:$PATH && export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH && export LIBRARY_PATH=/usr/local/cuda/lib64:$LIBRARY_PATH && git clone https://github.com/QuanluZhang/taco.git && cd taco && git checkout artifact && \
    mkdir build && cd build && cmake -DCMAKE_BUILD_TYPE=Release -D CUDA_TOOLKIT_ROOT_DIR=/usr/local/cuda -DCUDA=ON .. && \
    make -j8

# install azcopy
RUN wget https://aka.ms/downloadazcopy-v10-linux && tar xzvf downloadazcopy-v10-linux && cp azcopy_linux_amd64_10.14.1/azcopy /usr/local/bin

# configure the bashrc
RUN echo 'export NNFUSION_HOME=/root/nnfusion \n\
    export TACO_HOME=/root/taco \n\
    export PATH=$PATH:$TACO_HOME/build/bin \n\
    export PYTHONPATH=/root/tvm/python:$PYTHONPATH \n\
    export PATH=$NNFUSION_HOME/build/src/tools/nnfusion:$PATH \n\
    export CUDA_HOME=/usr/local/cuda \n\
    source ~/anaconda/etc/profile.d/conda.sh \n\
    ' >> /root/.bashrc

```

输入命令

```bash
docker build . -f Dockerfile.sparta -t sparta
```

进行构建

完成后输入命令

```bash
docker system prune
docker run  -p 8087:22 --restart=on-failure --runtime=nvidia  -it sparta /bin/bash
```

## `Docker` 内环境的搭建

进入容器内部后，输入 `nvidia-smi` 进行查看：

![image-20230612141828054](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230612141828054.png)

出现如下输出即视为成功。

输入命令

```bash
mkdir workspace && cd workspace
```

后，开始安装两个框架。

## `SparTA` 的安装

输入命令

```bash
git clone https://github.com/microsoft/nni && cd nni && git checkout sparta_artifact
conda activate spar
python setup.py develop
cd script && bash init_env.sh
```

> 在下载 `checkpoint` 的时候会发生错误，错误原因应该是 `nni` 把下载的 `url` 移动了，但是文档没更新

## `SparseTIR` 的安装

> 如果在 `dockerfile` 构建失败的话，把最后的 RUN 删除后，进行下面的步骤

编辑 `build.sh` 文件如下：

```bash
git clone --recursive https://github.com/uwsampl/SparseTIR.git sparsetir && cd sparsetir/cmake && \
echo set\(USE_LLVM ON\) >> config.cmake && \
echo set\(HIDE_PRIVATE_SYMBOLS ON\) >> config.cmake && \
echo set\(USE_CUDA ON\) >> config.cmake && \
echo set\(USE_CUBLAS ON\) >> config.cmake && \
echo set\(USE_CUDNN ON\) >> config.cmake && \
echo set\(USE_RELAY_DEBUG ON\) >> config.cmake && \
cd .. && \
mkdir -p build && \
cd build && \
cp ../cmake/config.cmake . && \
cmake .. && \
make -j$(nproc) && \
pip install decorator && \
cd .. && \
export SPARSETIR_PATH=$(pwd) && \
export PYTHONPATH=${SPARSETIR_PATH}/python:${PYTHONPATH} && \
eval "$(/root/anaconda/bin/conda shell.bash hook)" && conda activate tir && \
cd python && python setup.py install  && cd ..
```

然后运行：

```bash
bash build.sh
```

如果在 `make` 时会报错：

![image-20230612153235404](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230612153235404.png)

纠错方式为，将报错的部分全部改为：

```cpp
alloca->getAlign().value()
```

即可

> 出现这个问题是因为 `llvm` 的版本太高了，可能安装了 `llvm-15` 或者 `llvm-16` ，可以安装低版本的`llvm` 来解决（注意不能低于 `llvm-10`）

随后输入如下命令进行 `python` 包的安装：

```bash
cd python
python setup.py install
cd ..
```

注意，在复现时还需要很多依赖包，需要自己去添加

> [!important]
>
> 其中 `dgl` 的包版本需要 `<=1.0`，否则会出错，其他包似乎没有版本要求，最新版均可
>
> 安装 `dgl` 的命令如下：
>
> ```bash
> conda install -c dglteam/label/cu117 dgl
> ```

# `SparTA` 实验复现

复现环境：

|    环境     |            版本             |
| :---------: | :-------------------------: |
|     OS      |        Ubuntu-20.04         |
|    cuda     |        cudnn-11.7.0         |
|   python    |           3.9.16            |
|   PyTorch   |            2.0.1            |
| trochvision |           0.15.2            |
|     gpu     | NVIDIA GeForce RTX 3090 × 2 |

以图为例，从 `Figure 8` 开始复现：

初始结果：

![image-20230612154601932](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230612154601932.png)

输入命令：

```bash
cd script
bash init_checkpoint.sh
cd figure8 && bash run.sh
```

注意，可能报错：`ModuleNotFoundError: No module named 'tqdm'` 安装一下即可

> [!important]
>
> 还需要安装 `nni` ：
>
> ```bash
> git clone https://github.com/zheng-ningxin/nni.git && cd nni && git checkout artifact
> pip install -U -r dependencies/setup.txt
> pip install -r dependencies/develop.txt
> python setup.py develop
> pip install tensorboard transformers==3.5.0 onnxruntime graphviz onnx soundfile datasets==2.0.0 ply matplotlib numpy librosa
> ```
>
> 如果遇到 `ERROR: Could not find a version that satisfies the requirement sentencepiece==0.1.91 (from transformers) (from versions: 0.0.0, 0.0.2, 0.0.3, 0.0.4, 0.0.5, 0.0.6, 0.0.7, 0.0.9, 0.1.0, 0.1.1, 0.1.2, 0.1.3, 0.1.83, 0.1.86, 0.1.91, 0.1.92, 0.1.94, 0.1.95, 0.1.96, 0.1.97, 0.1.98, 0.1.99)` 错误，需要升级 `pip`：
>
> ```bash
> pip install --upgrade pip
> pip install transformers
> ```

# `SparseTIR` 实验复现

|    环境     |        版本         |
| :---------: | :-----------------: |
|     OS      |    Ubuntu 20.04     |
|    cuda     | cudnn8-devel-11.7.0 |
|   python    |       3.9.16        |
|  anaconda   |       23.3.1        |
|   pytorch   |        2.0.1        |
| torchvision |       0.15.2        |
|     gpu     |      2×RTX3090      |
|             |                     |

# `SpMM`

`AE`代码如下：

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
            C[i, k1, k2, k3] = T.float32(0)
            # if hyb enable C[i, k1, k2, k3] = 0.0
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


def bench_nodecomposition(
    g,
    x,
    y_golden,
    feat_size=128,
    cwm=2,
):
    indptr, indices, _ = g.adj_sparse("csc")
    m = g.num_dst_nodes()
    n = g.num_src_nodes()
    nnz = g.num_edges()
    if feat_size < 64:
        cwm = 1
    mod = tvm.IRModule.from_expr(csrmm)
    # specialize
    params = mod["main"].params
    param_map = {
        params[5]: m,  # m
        params[6]: n,  # n
        params[7]: feat_size // cwm // 32,  # num_tiles,
        params[8]: nnz,  # nnz
        params[9]: cwm,  # cwm
    }

    mod["main"] = mod["main"].specialize(param_map)

    # schedule
    mod = tvm.sparse.lower_sparse_iter(mod)
    sch = tvm.tir.Schedule(mod)
    outer_blk = sch.get_block("csrmm0")
    inner_blk = sch.get_block("csrmm1")
    (i,) = sch.get_loops(outer_blk)
    j, foo, foi, fi = sch.get_loops(inner_blk)
    sch.reorder(foo, fi, j, foi)
    sch.bind(fi, "threadIdx.x")
    sch.bind(foo, "blockIdx.y")
    sch.unroll(foi)
    io, ii = sch.split(i, [None, 8])
    sch.bind(io, "blockIdx.x")
    sch.bind(ii, "threadIdx.y")
    init_blk = sch.decompose_reduction(inner_blk, fi)
    ax0, ax1 = sch.get_loops(init_blk)[-2:]
    sch.bind(ax0, "threadIdx.x")
    mod = tvm.sparse.lower_sparse_buffer(sch.mod)
    f = tvm.build(mod["main"], target="cuda")
    # prepare nd array
    indptr_nd = tvm.nd.array(indptr.numpy().astype("int32"), device=tvm.cuda(0))
    b_nd = tvm.nd.array(
        x.numpy().reshape(-1).astype("float32"),
        device=tvm.cuda(0),
    )
    indices_nd = tvm.nd.array(indices.numpy().astype("int32"), device=tvm.cuda(0))
    c_nd = tvm.nd.array(np.zeros((n * feat_size,)).astype("float32"), device=tvm.cuda(0))
    a_nd = tvm.nd.array(np.ones((nnz,)).astype("float32"), device=tvm.cuda(0))
    args = [a_nd, b_nd, c_nd, indptr_nd, indices_nd]
    f(*args)
    tvm.testing.assert_allclose(c_nd.numpy().reshape(-1, feat_size), y_golden.numpy(), rtol=1e-4)
    evaluator = f.time_evaluator(f.entry_name, tvm.cuda(0), number=100)
    return evaluator(*args).mean * 1000


def bench_decomposition(
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
    return evaluator(*args).mean * 1000

def spmm_hyb(dataset="arxiv"):
    time_list = []
    parser = argparse.ArgumentParser("hybrid format spmm in sparse-tir")
    parser.add_argument("--dataset", "-d", type=str, default=dataset, help="dataset name")
    parser.add_argument("--implicit-unroll", "-i", action="store_true", help="use implicit unroll")
    args = parser.parse_args()
    name = args.dataset
    g = get_dataset(name)

    for feat_size in [32, 64, 128, 256, 512]:
        x = th.rand((g.num_src_nodes(), feat_size))
        y_golden = dgl.ops.copy_u_sum(g, x)
        exec_time = bench_decomposition(
            g,
            x,
            y_golden,
            feat_size=feat_size,
            bucket_sizes=bucketing_config[name],
            coersening_factor=2,
            num_col_parts=col_part_config[name],
            use_implicit_unroll=args.implicit_unroll,
        )
        time_list.append((feat_size, exec_time))

    return time_list

def spmm_nohyb(dataset="arxiv"):
    time_list = []
    parser = argparse.ArgumentParser("hybrid format spmm in sparse-tir")
    parser.add_argument("--dataset", "-d", type=str, default=dataset, help="dataset name")
    args = parser.parse_args()
    name = args.dataset
    g = get_dataset(name)

    for feat_size in [32, 64, 128, 256, 512]:
        x = th.rand((g.num_src_nodes(), feat_size))
        y_golden = dgl.ops.copy_u_sum(g, x)
        exec_time = bench_nodecomposition(
            g,
            x,
            y_golden,
            feat_size=feat_size,
            cwm=2,
        )
        time_list.append((feat_size, exec_time))

    return time_list


if __name__ == "__main__":
    dataset_name = ["arxiv", "proteins", "pubmed", "citeseer", "cora", "ppi", "reddit"]
    time_log = {}
    speedup = lambda x, y: x / y
    for dataset in dataset_name:
        nodecomposition_time = spmm_nohyb(dataset)
        decomposition_time = spmm_hyb(dataset)
        time_log[dataset] = [decomposition_time[i][1] / nodecomposition_time[i][1] for i in range(5)]

    print(time_log)
```

> 关于 `taco` 的安装

```bash
git clone https://github.com/tensor-compiler/taco.git
cd taco
mkdir -p build
cd build
cmake -DCMAKE_BUILD_TYPE=Release -DPYTHON=ON -DCUDA=ON ..
make -j8
export PYTHONPATH=/root/taco/build/lib:$PYTHONPATH
export PATH=/usr/local/cuda/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH
export LIBRARY_PATH=/usr/local/cuda/lib64:$LIBRARY_PATH
```

注意这里的 `python` 版本要与 `conda` 中的一致，例如 `conda` 中的 `python` 版本为 `3.9.16` ，那么本机中也要安装 `3.9.16` 的 `python`

安装完成后，运行：

```bash
python build/python_bindings/unit_tests.py
```

查看是否通过测试
