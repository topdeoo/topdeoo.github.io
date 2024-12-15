---
title: Machine Boot
description: Set the envrionment and boot the machine
tags:
  - IPADS
  - 操作系统
  - 环境配置
date: 2023-09-11
lastmod: 2024-12-15
draft: false
---

# Envrionment Setting

My Computer information (which is required):

- OS: Linux x86_64 (6.1.53-1-MANJARO)
- CPU: 13th Gen Intel i5-13500H (16) @ 4.700GHz
- GPU: Intel Raptor Lake-P \[Iris Xe Graphics\]
- Memory: 16GB
- Editor: VS Code
- C Compiler: gcc(version 13.2.1) clang(version 16.0.6)
- C++ Compiler: g++(version 13.2.1) clang++(version 16.0.6)
- C/C++ build tools: cmake(version 3.27.6) xmake(version 2.8.3) make(version 4.4.1)
- Rust: rustc 1.73.0-nightly
- Python: Python 3.11.5
- Java: openjdk 21 2023-09-19
- Go: version go1.21.1 linux/amd64

## How to build

Run command below in your shell:

```bash
git clone https://gitee.com/ipads-lab/chcore-lab-v2.git
cd chcore-lab-v2
make build
```

and then it will pull a image from docker hub, which is called chcore_builder.

> If error like "failed to add the host (veth28449b0) <=> sandbox (veth45f4af9) pair interfaces: operation not supported." occurs, try to restart your computer or docker

Now, you've already build a file named "kernel.img" in directory "build/".

## How to run

Simply run :

```bash
make qemu
```

to run `Chcore`

> Note that there is no output, which is normal. It won't give any output until you finish lab1

## How to debug

You need install `gdb-multiarch` to debug. For example, in my manjaro, run :

```bash
yay -S gdb-multiarch
```

If you're in Ubuntu, just run :

```
sudo apt-get install gdb-multiarch
```

After installing, using two bash(or anything else such as `tmux`), one run :

```bash
make qemu-gdb
```

to activate qemu's gdb mode, the other run :

```bash
make gdb
```

to connect the remote target(i.e. the qemu's gdb mode).

If you see this, then it's success.

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230901091127.png)

## How to edit code

I strongly recommand `VS Code`, just `cd` into this directory and type `code .`, then you can use it to edit the code.

# Machine Boot

The lab document is in `docs/`, follow it to finish the lab.

## Pre

Modify `Makefile` like this :

```makefile
qemu: build
	$(V)$(_QEMU) $(QEMU_OPTS)

qemu-gdb: build
	$(V)$(_QEMU) -S -gdb tcp::$(QEMU_GDB_PORT) $(QEMU_OPTS)
```

That would avoid run code but do not update it

## Q1

> 阅读  `_start`  函数的开头，尝试说明 ChCore 是如何让其中一个核首先进入初始化流程，并让其他核暂停执行的。

1. Read the cpu id from `mpidr_el1` register to the `x8` register
2. Get the low 8-bit value of the register `x8`
3. Check if low 8-bit is `0`, if true, then jump to function `primary`, else, make a infnity loop to build a fence to stop others cores at this instruction
4. function `primary` will enter a initial procedure, including set the exception level to `EL1` and stack size, transfer control to the kernel

for more: register `mpidr_el1` store the information of core, in multi-processor system, every processor has a unique value of `mpidr_el1`.

## M2

> 练习题 2：在  `arm64_elX_to_el1`  函数的  `LAB 1 TODO 1`  处填写一行汇编代码，获取 CPU 当前异常级别。

```asm
mrs x9, CurrentEL
```

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230904230236.png)

## M3

Look at label `.Lno_gic_sr`, that is how to jump to `el1` from `el2`.

So we write code like this :

```asm
	adr x9, .Ltarget
	msr elr_el3, x9
	mov x9, SPSR_ELX_DAIF | SPSR_ELX_EL1H
	msr spsr_el3, x9
```

to ensure our implementation is right, we use `gdb` below :

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230905101732.png)

we will see that it jump back `_start` from function `arm64_elX_to_el1`

## Q4

> 结合此前 ICS 课的知识，并参考  `kernel.img`  的反汇编（通过  `aarch64-linux-gnu-objdump -S`  可获得），说明为什么要在进入 C 函数之前设置启动栈。如果不设置，会发生什么？

We can see the assembly below :

```asm
   80010:	94001ffc 	bl	88000 <arm64_elX_to_el1>
   80014:	580000a0 	ldr	x0, 80028 <primary+0x18>
   80018:	91400400 	add	x0, x0, #0x1, lsl #12
   8001c:	9100001f 	mov	sp, x0
   80020:	940020e2 	bl	883a8 <init_c>
```

note that `=boot_cpu_stack` is `*0x80028`(i.e. 0x00088980), and `INIT_STACK_SIZE` is 0x1000(i.e. 0x1, lsl #12)

Because `init_c` is a function which require a stack frame. That's why we should initial the stack pointer and allocate stack space.

more details in [rCore](http://rcore-os.cn/rCore-Tutorial-Book-v3/chapter1/5support-func-call.html#jump-practice)

## Q5

> 在实验 1 中，其实不调用  `clear_bss`  也不影响内核的执行，请思考不清理  `.bss`  段在之后的何种情况下会导致内核无法工作。

Anser from GPT:

> 当不清零 `.bss` 段时，未显式初始化的全局变量和静态变量的初始值将是未定义的。这可能导致以下问题和错误：
>
> 1. 未定义的行为：访问未初始化的变量可能导致未定义的行为。这包括读取随机的内存值、产生不可预测的结果以及可能导致程序崩溃或错误的行为。
> 2. 依赖于零值的假设：在程序设计中，有时会假设未初始化的全局变量或静态变量的初始值为零。如果这些变量的初始值不是零，那么这些假设就会被破坏，可能导致程序逻辑错误或不一致。
> 3. 安全问题：如果未初始化的变量被认为是零值，而实际上它们存储了其他敏感信息，可能会引发安全问题。例如，如果未初始化的变量被用于存储密码、密钥或其他敏感数据，那么不清零可能导致这些敏感信息泄露。
> 4. 跨平台兼容性问题：不同的编译器和操作系统对未初始化变量的处理可能不同。在某些平台上，编译器或操作系统可能为未初始化变量提供默认的零值，而在其他平台上可能不会。因此，不清零 `.bss` 段可能导致在不同的平台上出现不一致的行为，影响跨平台的兼容性。

## M6

```c
void uart_send_string(char *str)
{
        /* LAB 1 TODO 3 BEGIN */

        while (*str != '\0') {
                early_uart_send((unsigned int)(*str));
                str++;
        }

        /* LAB 1 TODO 3 END */
}
```

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230905104428.png)

## M7

I wrote this in first

```asm
orr x8, x8, #0x82f
```

which enable all flags.

However, we can see that below here:

```asm
	bic     x8, x8, #SCTLR_EL1_A
	bic     x8, x8, #SCTLR_EL1_SA0
	bic     x8, x8, #SCTLR_EL1_SA
	orr     x8, x8, #SCTLR_EL1_nAA
```

it reminds us that we should just enable one flag here, i.e. flag `M`, so the correct code is :

```asm
orr x8, x8, #SCTLR_EL1_M
```

# How to Grade

Remember to install `expect`， in Manjaro you can :

```bash
yay -S expect
```

then type :

```bash
make grade
```

you will see something like this:

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230907150335.png)
