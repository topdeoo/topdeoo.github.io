---
title: TVM 运行环境搭建
description: 介绍如何在一台只有 docker 的环境的服务器下配置 tvm 运行环境
tags:
  - MLSys
  - 编译器
  - 环境配置
date: 2023-06-06
lastmod: 2024-12-15
draft: false
---


请在宿主服务器上安装 `cuda` 的驱动程序

# 镜像准备

下载 [image](https://hub.docker.com/layers/nvidia/cuda/11.7.0-devel-ubuntu20.04/images/sha256-e5b0bb8d257ed720b9749e69bae6888764355df1023bdd38a7906fbf55c882c1?context=explore) 此镜像（可以 `docker pull` 或者直接下载 `.tar` 文件），注意选择的 `ARCH` 为 `amd64`

> 若下载 `.tar` 文件，则需要使用  `docker load -i` 导入镜像

镜像下载成功后，我们需要开启 `sudo` 权限，在 `/etc/docker/daemon.json` 中添加如下内容（若不存在此文件，请先创建）：

```json
{
    "runtimes": {
        "nvidia": {
            "path": "/usr/bin/nvidia-container-runtime",
            "runtimeArgs": []
         }
    }
}
```

# 容器建立

运行:

```bash
docker run --restart=on-failure --runtime=nvidia --network host  -it {{your image name}} /usr/bin/sh
```

`{{your image name}}` 处填写镜像名称，使用 `docker image ls` 可查看，注意需要名称加标签，例如：

![image-20230606143703144](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230606143703144.png)

写作：`nvidia/cuda:11.7.0-cudnn8-devel-ubuntu20.04`
进入容器后，执行命令：

```bash
nvidia-smi
```

出现类似下面的表格即成功创建了可运行 `cuda` 的 `docker` 容器

![image-20230606143856534](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230606143856534.png)

# 构建准备

安装必要的软件，当然首先进行换源：

```bash
sed -i 's/archive.ubuntu.com/mirrors.ustc.edu.cn/g' /etc/apt/sources.list
```

然后安装软件：

```bash
apt update
apt upgrade
apt update
apt-get install -y python3 python3-dev python3-setuptools gcc libtinfo-dev zlib1g-dev build-essential libedit-dev libxml2-dev libssl-dev unzip vim wget git
```

安装 `cmake-3.20`

```bash
wget https://github.com/Kitware/CMake/releases/download/v3.20.0/cmake-3.20.0.tar.gz
tar -xvf cmake-3.20.0.tar.gz
cd cmake-3.20.0
./configure
make -j6
make install
cp bin/cmake /usr/bin/
```

完成后输入 `cmake -version` 查看是否成功

安装 `llvm`

运行 

```bash
apt install lsb-release wget software-properties-common gnupg -y
wget https://apt.llvm.org/llvm.sh
chmod u+x llvm.sh
./llvm.sh 14 all
```

# 构建 `tvm`

1. 从 `github` 下载

   ```bash
   git clone --recursive https://github.com/apache/tvm tvm
   ```

2. 下载 `.zip` 然后从本机传到 `docker` 上解压

   在本机上，输入：`docker cp ~/tvm.zip {{container id}}:/root/`， 在  `{{container id}}` 处输入容器的 `id` ，可以用 `docker ps -a` 进行查看

   然后进入 `docker` 中，输入

   ```bash
   unzip tvm.zip
   ```

得到一个 `tvm` 文件夹，随后进行构建

> 注意，请下载 `v0.1.0` 版本，否则可能无法正常运行

```bash
unzip tvm.zip
cd tvm
mkdir -p build
cd build
cp ../cmake/config.cmake build
vim config.cmake # 在这里修改配置
```

修改内容如下：

将`set(USE_CUDA OFF)` 改为 `set(USE_CUDA ON)` 启用 `CUDA` 后端，如果要使用例如 `OpenGL` 则启用对应的即可

`LLVM` 将 `set(USE_LLVM OFF)` 改为 `set(USE_LLVM ON)`

`IR` 调试，设置 `set(USE_RELAY_DEBUG ON)`，同时设置环境变量 *TVM_LOG_DEBUG*

```bash
export TVM_LOG_DEBUG="ir/transform.cc=1,relay/ir/transform.cc=1"
```

然后:

```bash
source .bashrc
```

重启环境

然后在 `build` 文件夹中，输入：

```bash
cmake -DCMAKE_BUILD_TYPE=Debug ..
make -j8
```

等待 `libtvm.so` 的构建完成

对于 `python` 包的构建，设置环境变量 `PYTHONPATH` 来告诉 python 在哪里找到这个库。例如，假设我们在 `/path/to/tvm` 目录下克隆了 `tvm`，那么我们可以在 `~/.bashrc` 中添加以下一行。一旦你拉出代码并重建项目，这些变化将立即反映出来（不需要再次调用 `setup`）

```bash
export TVM_HOME=/path/to/tvm
export PYTHONPATH=$TVM_HOME/python:${PYTHONPATH}
```

然后在 `tvm` 目录下输入：

```bash
cd python; python3 setup.py install --user; cd ..
```

> [!bug]
> 
> 在安装 `scipy` 时会报错，要求 `python` 版本大于等于 `3.9`，所以有些包需要我们手动安装：
>
> ```bash
> apt install -y pip
> pip uninstall numpy
> pip install "numpy<=1.23" decorator attrs psutil 'xgboost<1.6.0' cloudpickle ml_dtypes scipy 
> ```

启用 `C++` 测试（注意这里在 `~` 目录下进行）

```bash
git clone https://github.com/google/googletest
cd googletest
mkdir build
cd build
cmake -DBUILD_SHARED_LIBS=ON ..
make -j6
make install
```

然后在 `tvm` 目录下，运行：

```bash
make cpptest -j6
```

进行构建，若无报错则已构建成功

# 测试

参见 [编译PyTorch模型](https://daobook.github.io/tvm/docs/how_to/compile_models/from_pytorch.html) 测试

运行命令

```bash
pip install torch==1.7.0
pip install torchvision==0.8.1
```

然后创建一个 `torch_test.py` ，内容如下：

```python
import time
import tvm
from tvm import relay
import numpy as np
from tvm.contrib.download import download_testdata
import torch
import torchvision
from scipy.special import softmax
# device = torch.device("cpu")
model_name = "resnet18"
model = getattr(torchvision.models, model_name)(pretrained=True)
model = model.eval()

# We grab the TorchScripted model via tracing
input_shape = [1, 3, 224, 224]
input_data = torch.randn(input_shape)
scripted_model = torch.jit.trace(model, input_data).eval()

from PIL import Image

img_url = "https://github.com/dmlc/mxnet.js/blob/main/data/cat.png?raw=true"
img_path = download_testdata(img_url, "cat.png", module="data")
print(img_path)
img = Image.open(img_path).resize((224, 224))

# Preprocess the image and convert to tensor
from torchvision import transforms


my_preprocess = transforms.Compose(
    [
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)
img = my_preprocess(img)
img = np.expand_dims(img, 0)

######################################################################
# Import the graph to Relay
# -------------------------
# Convert PyTorch graph to Relay graph. The input name can be arbitrary.
input_name = "input0"
shape_list = [(input_name, img.shape)]
mod, params = relay.frontend.from_pytorch(scripted_model, shape_list)

######################################################################
# Relay Build
# -----------
# Compile the graph to llvm target with given input specification.
target = "llvm"
target_host = "llvm"
dev = tvm.cpu(0)
with tvm.transform.PassContext(opt_level=7):
    lib = relay.build(mod, target=target, target_host=target_host, params=params)

######################################################################
# Execute the portable graph on TVM
# ---------------------------------
# Now we can try deploying the compiled model on target.
from tvm.contrib import graph_executor

m = graph_executor.GraphModule(lib["default"](dev))

tvm_time_spent=[]
torch_time_spent=[]
n_warmup=5
n_time=10
# tvm_t0 = time.process_time()
for i in range(n_warmup+n_time):
    dtype = "float32"
    # Set inputs
    m.set_input(input_name, tvm.nd.array(img.astype(dtype)))
    tvm_t0 = time.time()
    # Execute
    m.run()
    # Get outputs
    tvm_output = m.get_output(0)
    tvm_time_spent.append(time.time() - tvm_t0)
# tvm_t1 = time.process_time()

#####################################################################
# Look up synset name
# -------------------
# Look up prediction top 1 index in 1000 class synset.
synset_url = "".join(
    [
        "https://raw.githubusercontent.com/Cadene/",
        "pretrained-models.pytorch/master/data/",
        "imagenet_synsets.txt",
    ]
)
synset_name = "imagenet_synsets.txt"
synset_path = download_testdata(synset_url, synset_name, module="data")
with open(synset_path) as f:
    synsets = f.readlines()

synsets = [x.strip() for x in synsets]
splits = [line.split(" ") for line in synsets]
key_to_classname = {spl[0]: " ".join(spl[1:]) for spl in splits}

class_url = "".join(
    [
        "https://raw.githubusercontent.com/Cadene/",
        "pretrained-models.pytorch/master/data/",
        "imagenet_classes.txt",
    ]
)
class_name = "imagenet_classes.txt"
class_path = download_testdata(class_url, class_name, module="data")
with open(class_path) as f:
    class_id_to_key = f.readlines()

class_id_to_key = [x.strip() for x in class_id_to_key]

# Get top-1 result for TVM
top1_tvm = np.argmax(tvm_output.asnumpy()[0])
tvm_class_key = class_id_to_key[top1_tvm]

# Convert input to PyTorch variable and get PyTorch result for comparison
# torch_t0 = time.process_time()
# torch.set_num_threads(1)
for i in range(n_warmup+n_time):
    with torch.no_grad():
        torch_img = torch.from_numpy(img)
        torch_t0 = time.time()
        output = model(torch_img)
        torch_time_spent.append(time.time() - torch_t0)
        # Get top-1 result for PyTorch
        top1_torch = np.argmax(output.numpy())
        torch_class_key = class_id_to_key[top1_torch]
# torch_t1 = time.process_time()

# tvm_time = tvm_t1 - tvm_t0
# torch_time = torch_t1 - torch_t0
tvm_time = np.mean(tvm_time_spent[n_warmup:]) * 1000
torch_time = np.mean(torch_time_spent[n_warmup:]) * 1000
tvm_output_prob = softmax(tvm_output.asnumpy())
output_prob = softmax(output.numpy())
print("Relay top-1 id: {}, class name: {}, class probality: {}".format(top1_tvm, key_to_classname[tvm_class_key], tvm_output_prob[0][top1_tvm]))
print("Torch top-1 id: {}, class name: {}, class probality: {}".format(top1_torch, key_to_classname[torch_class_key], output_prob[0][top1_torch]))
print('Relay time(ms): {:.3f}'.format(tvm_time))
print('Torch time(ms): {:.3f}'.format(torch_time))
```

注意，在文档中给出了 `import set_env` 

`set_env` 用于在本次运行代码前添加如下函数用于设置 Python 临时环境：

```python
def set_env(num, current_path='.'):
    '''
    num 表示相对于 current_path 的父级根目录级别
    '''
    import sys
    from pathlib import Path

    ROOT = Path(current_path).resolve().parents[num]
    sys.path.extend([str(ROOT/'src')]) # 设置 `tvm_book` 环境
    from tvm_book.config.env import set_tvm
    # 设置 TVM 环境
    set_tvm(TVM_ROOT)
```

`set_tvm` 需要自行配置以适配设备

如果使用 `cuda` 的话，代码为：

```python
import time
import tvm
from tvm import relay
import numpy as np
from tvm.contrib.download import download_testdata
import torch
import torchvision
from scipy.special import softmax
# device = torch.device("cpu")
model_name = "resnet18"
model = getattr(torchvision.models, model_name)(pretrained=True)
model = model.eval()

# We grab the TorchScripted model via tracing
input_shape = [1, 3, 224, 224]
input_data = torch.randn(input_shape)
scripted_model = torch.jit.trace(model, input_data).eval()

from PIL import Image

img_url = "https://github.com/dmlc/mxnet.js/blob/main/data/cat.png?raw=true"
img_path = download_testdata(img_url, "cat.png", module="data")
print(img_path)
img = Image.open(img_path).resize((224, 224))

# Preprocess the image and convert to tensor
from torchvision import transforms


my_preprocess = transforms.Compose(
    [
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)
img = my_preprocess(img)
img = np.expand_dims(img, 0)

######################################################################
# Import the graph to Relay
# -------------------------
# Convert PyTorch graph to Relay graph. The input name can be arbitrary.
input_name = "input0"
shape_list = [(input_name, img.shape)]
mod, params = relay.frontend.from_pytorch(scripted_model, shape_list)

######################################################################
# Relay Build
# -----------
target = "cuda"
target_host = "llvm"
dev = tvm.gpu(0)
with tvm.transform.PassContext(opt_level=7):
    lib = relay.build(mod, target=target, target_host=target_host, params=params)

######################################################################
# Execute the portable graph on TVM
# ---------------------------------
# Now we can try deploying the compiled model on target.
from tvm.contrib import graph_executor

m = graph_executor.GraphModule(lib["default"](dev))

tvm_time_spent=[]
torch_time_spent=[]
n_warmup=5
n_time=10
# tvm_t0 = time.process_time()
for i in range(n_warmup+n_time):
    dtype = "float32"
    # Set inputs
    m.set_input(input_name, tvm.nd.array(img.astype(dtype)))
    tvm_t0 = time.time()
    # Execute
    m.run()
    # Get outputs
    tvm_output = m.get_output(0)
    tvm_time_spent.append(time.time() - tvm_t0)
# tvm_t1 = time.process_time()

#####################################################################
# Look up synset name
# -------------------
# Look up prediction top 1 index in 1000 class synset.
synset_url = "".join(
    [
        "https://raw.githubusercontent.com/Cadene/",
        "pretrained-models.pytorch/master/data/",
        "imagenet_synsets.txt",
    ]
)
synset_name = "imagenet_synsets.txt"
synset_path = download_testdata(synset_url, synset_name, module="data")
with open(synset_path) as f:
    synsets = f.readlines()

synsets = [x.strip() for x in synsets]
splits = [line.split(" ") for line in synsets]
key_to_classname = {spl[0]: " ".join(spl[1:]) for spl in splits}

class_url = "".join(
    [
        "https://raw.githubusercontent.com/Cadene/",
        "pretrained-models.pytorch/master/data/",
        "imagenet_classes.txt",
    ]
)
class_name = "imagenet_classes.txt"
class_path = download_testdata(class_url, class_name, module="data")
with open(class_path) as f:
    class_id_to_key = f.readlines()

class_id_to_key = [x.strip() for x in class_id_to_key]

# Get top-1 result for TVM
top1_tvm = np.argmax(tvm_output.asnumpy()[0])
tvm_class_key = class_id_to_key[top1_tvm]

# Convert input to PyTorch variable and get PyTorch result for comparison
# torch_t0 = time.process_time()
# torch.set_num_threads(1)
for i in range(n_warmup+n_time):
    with torch.no_grad():
        torch_img = torch.from_numpy(img)
        torch_t0 = time.time()
        output = model(torch_img)
        torch_time_spent.append(time.time() - torch_t0)
        # Get top-1 result for PyTorch
        top1_torch = np.argmax(output.numpy())
        torch_class_key = class_id_to_key[top1_torch]
# torch_t1 = time.process_time()

# tvm_time = tvm_t1 - tvm_t0
# torch_time = torch_t1 - torch_t0
tvm_time = np.mean(tvm_time_spent[n_warmup:]) * 1000
torch_time = np.mean(torch_time_spent[n_warmup:]) * 1000
tvm_output_prob = softmax(tvm_output.asnumpy())
output_prob = softmax(output.numpy())
print("Relay top-1 id: {}, class name: {}, class probality: {}".format(top1_tvm, key_to_classname[tvm_class_key], tvm_output_prob[0][top1_tvm]))
print("Torch top-1 id: {}, class name: {}, class probality: {}".format(top1_torch, key_to_classname[torch_class_key], output_prob[0][top1_torch]))
print('Relay time(ms): {:.3f}'.format(tvm_time))
print('Torch time(ms): {:.3f}'.format(torch_time))
```

运行代码即可

> 运行会出现很多日志，暂时还没找到消除的方法，这个日志应该是由于开启了 `USE_RELAY_DEBUG` 的原因

运行成功的截图如下：

![image-20230607153629442](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230607153629442.png)

> 如果第二次运行出现 `Module Not Found: "tvm" is not found` 这种错误，请重新安装 `tvm` 的 `python` 环境 



