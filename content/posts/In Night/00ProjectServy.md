---
title: SparrOS：A Toy OS 0x00
math: true
date: 2024-04-14 11:15:13
keywords:
  - NENU
  - OS
categories:
  - InNight
  - OS
cover: wallpaper/20230724204246.png
description:
---
本人的一些毕业设计，没有什么能比自己写一个操作系统更有意思了！

> 一个退役ACMer的叛变

由于我很喜欢 `xv6` 的设计，但是有很想写 `Rust`，但是又有点不太喜欢 `rCore` 的一些步骤设计（虽然确实很符合发展历程，但总觉得不适合自底向上的迭代开发……）

于是，开了这么一个专栏，用来记录自己的 `OS` 开发生涯。
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
- `modules` 中的每一个实现均为一个 `lib`，例如日志库等
- `kernel` 为内核实现

