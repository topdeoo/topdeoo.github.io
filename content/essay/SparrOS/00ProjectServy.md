---
title: "SparrOS: A Toy OS 0x00"
description: 
tags:
  - NENU
  - OS
date: 2024-04-14
lastmod: 2024-12-10
draft: true
---
本人的一些毕业设计，没有什么能比自己写一个操作系统更有意思了！

> 一个退役ACMer的叛变

由于我很喜欢 `xv6` 的设计，但是有很想写 `Rust`，但是又有点不太喜欢 `rCore` 的一些步骤设计（虽然确实很符合发展历程，但总觉得不适合自底向上的迭代开发……）

于是，开了这么一个专栏，用来记录自己的 `OS` 开发生涯。

项目地址为:

{{< link-card name="SparrOS" link="https://github.com/topdeoo/SparrOS-RISCV" img="" >}}

# 开发环境

项目直接在 `x86-64` 的 `Manjaro` 下开发，本机的运行与开发环境如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202404151100991.png)

`Qemu` 与 `Rust` 及其组件的版本如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202404151102174.png)

我们在 `rust-toolchain.toml` 中管理其组件与版本：

```toml
[toolchain]
profile = "minimal"
components = ["rust-src", "llvm-tools-preview", "rustfmt", "clippy"]
channel = "nightly"
target = "riscv64gc-unknown-none-elf"

```

## 升级工具版本（IF）

可能并不是很需要升级，如果使用的系统是 `Arch` 系的话，当然对于 `Ubuntu` 这种大众系统，升级方式如下：

1. 对于 `qemu` ，请手动安装，因为 `apt` 源中的版本确实很低
	手动安装的意思就是从源码编译安装，文档的地址为：[QEMU Source Install](https://www.qemu.org/download/#source)
2. 对于 `Rust`，简单的直接输入 `rustup update` 即可升级

# 调试环境

推荐使用 `gdb-multiarch`

对于 `Ubuntu` 的下载，可以参照 [xv6-Tools](https://pdos.csail.mit.edu/6.S081/2020/tools.html) 中写的，但请注意不要下载 `qemu` 的旧版本，使用上面的新版本即可。

# 项目架构

```text
.
├── arch
│   ├── Cargo.toml
│   ├── lib.rs
│   └── riscv64
│       ├── entry.rs
│       ├── mod.rs
│       └── sbi.rs
├── Cargo.lock
├── Cargo.toml
├── docs
├── kernel
│   ├── Cargo.toml
│   └── src
│       └── main.rs
├── Makefile
├── modules
│   └── logger
├── rust-toolchain.toml
└── target
```

如上所示，其中 
- `arch` 为 `lib`，不同平台的实现在不同的文件夹内
- `modules` 中的每一个实现均为一个 `lib`，我们会在这里实现内核的各类模块，例如内存分配器，页帧分配器等
- `kernel` 为内核的主函数实现

# 参考文献

- [Writing an OS in Rust](https://os.phil-opp.com/zh-CN/)
- [RISC-V OS using Rust](https://osblog.stephenmarz.com/)
- [Tsinghua rCore](https://github.com/rcore-os/rCore)
- [MIT xv6](https://github.com/mit-pdos/xv6-riscv)
- [xv6-Rust](https://github.com/o8vm/octox)
- [os-dev](https://wiki.osdev.org/Main_Page)
- [计算机系统大赛](https://os.educg.net/)
- [bbl-ucore](https://github.com/ring00/bbl-ucore)
- [hurlex](https://github.com/hurley25/hurlex-doc/)
- [Linux-0.11](https://kernel.org/)

> 还有各种文档，在这里不全部列出，尤其是 `RISC-V` 的两卷手册