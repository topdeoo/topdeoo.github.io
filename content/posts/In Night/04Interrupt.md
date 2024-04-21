---
title: "SparrOS: A Toy OS 0x04"
math: true
date: 2024-04-15T16:23:42+08:00
keywords:
  - NENU
  - OS
categories:
  - InNight
  - OS
cover: wallpaper/117165573_p1.png
draft: true
description:
---

> 此提交的 `hash` 为 `27e32e4b8bcb819cc252b98c122bd1d6e0482608`
> 输出 `git checkout <commit-hash>` 以查看

> Tips: 由于我们在上个提交与这个之间执行了多次项目的重构，因此在这部分可能需要重新梳理一遍项目结构。

我们在这一节实现系统软件级别的中断 `intr` 与陷入 `trap`，随后为操作系统写一个时钟管理器的驱动，并开启时钟中断。
# Interrupt & Trap

中断和陷入在现代操作系统中并没有很强的界限，我们可以将其朴素的理解为都是异常处理：
1. 中断：一般是硬件主动发起的，例如最经典的时钟中断，以及 `DMA`
2. 陷入：一般是由软件触发的，例如 `syscall` 以及 `page fault`

既然都可以当作异常处理，那么根据 `xv6` 的设计，我们只需要有一个异常向量表和处理函数，即可完成中断 & 陷入的实现。

## Overview

首先，我们明确操作系统的异常处理机制：
1. 程序触发异常，从用户态进入内核态
2. 操作系统需要保存 程序/计算机 当前的状态（也就是俗称的上下文, `Context`）
3. 随后，进入到异常的处理函数，进行进一步的判断与处理
4. 处理完成后，操作系统需要恢复之前的 程序/计算机 状态
5. 返回程序，从内核态进入用户态

一个最简单的图示如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202404151647159.png)

> 在内核中我们需要维护一个异常向量表，每个地址都对应了一种异常处理函数

这段话或许有些难以理解，但我们可以理解成我们通过一个 `kernel_trap` 函数来运行异常的总处理，在这个函数中，我们会通过 `sscause` 来判断当前需要处理的是什么异常，如果有对应的异常处理函数，我们就跳转处理，否则内核会直接 `panic`

## Implementation

首先，我们对 `Context` 进行设计，由于上下文本质上就是寄存器的值，显然：

```rust
#[repr(C)]
pub struct Context {
    pub x: [usize; 31],
    pub sepc: usize,
    pub sstatus: usize,
}

```

由于 `RISC-V` 有 `32` 个通用寄存器，分别命名为 `x0` 到 `x31`。这些寄存器还有一些常用的别名,如下:
1. `x0` 也称为 `zero`，这是一个固定为 0 的寄存器。
2. `x1` 也称为 `ra`（Return Address），用于保存函数调用的返回地址。
3. `x2` 也称为 `sp`（Stack Pointer），用于指向栈顶。
4. `x3` 也称为 `gp`（Global Pointer），用于指向全局数据区。
5. `x4` 也称为 `tp`（Thread Pointer），用于指向当前线程的局部存储区。
6. `x5`-`x7` 也称为 `t0`-`t2`（Temporary Registers），用于存放临时变量。
7. `x8`-`x9` 也称为 `s0`-`s1`（Saved Registers），用于存放被调用函数需要保留的值。
8. `x10`-`x17` 也称为 `a0`-`a7`（Function Arguments），用于传递函数参数。
9. `x18`-`x27` 也称为 `s2`-`s11`（Saved Registers），用于存放被调用函数需要保留的值。
10. `x28`-`x31` 也称为 `t3`-`t6`（Temporary Registers），用于存放临时变量。

由于 `x0` 不会被改变（一直为 0），因此我们不需要保存它，那么需要保存的就只有剩余的 `31` 个
其次，我们在上下文中保留两个特殊寄存器，`sepc` 和 `sstatus`，分别代表了：
1. `sepc` (Supervisor Exception Program Counter)
    - 该寄存器保存了当前异常发生时处理器的程序计数器(PC)值。
    - 当处理器进入异常处理模式时,硬件会自动将当前 PC 的值保存到 `sepc` 寄存器中。
    - 异常处理完成后,处理器会从 `sepc` 寄存器中读取 PC 的值,并跳转回异常发生前的执行位置。
    - 这样可以确保异常处理完成后能够恢复到异常发生前的执行状态。
2. `sstatus` (Supervisor Status Register)
    - 该寄存器保存了当前处理器运行在特权模式(Supervisor mode)时的状态信息。
    - 它包含多个标志位,用于指示当前 CPU 的运行状态,如中断使能、虚拟内存启用、用户/特权模式等。
    - 通过读写 `sstatus` 寄存器,软件可以控制和查询当前 CPU 的运行状态。

仿照 `xv6` 中的实现，我们显然还需要知道两个寄存器的值：
1. `scause`：用于指明异常的原因
2. `stval`：提供了与异常/陷阱相关的附加信息

但这两个寄存器我们可以充分使用 `Rust` 中的 `riscv` 包，让后面的异常处理更容易一些

那么，对于 `kernelvec` 我们也可以参照 `xv6` 中的步骤：
1. 存储上下文
2. 设置函数参数并跳转
3. 恢复上下文并返回用户模式

```rust
#[naked]
pub unsafe extern "C" fn kernelvec() {
    asm!(
        r"
            .align 4
            .altmacro
            .set REGSIZE, 8
            .set CONTEXTREGS, 33
        ",
        // save context
        r"
            addi sp, sp, -REGSIZE*CONTEXTREGS
            sd ra, REGSIZE*0(sp)
            sd sp, REGSIZE*1(sp)
            sd gp, REGSIZE*2(sp)
            sd tp, REGSIZE*3(sp)
            sd t0, REGSIZE*4(sp)
            sd t1, REGSIZE*5(sp)
            sd t2, REGSIZE*6(sp)
            sd s0, REGSIZE*7(sp)
            sd s1, REGSIZE*8(sp)
            sd a0, REGSIZE*9(sp)
            sd a1, REGSIZE*10(sp)
            sd a2, REGSIZE*11(sp)
            sd a3, REGSIZE*12(sp)
            sd a4, REGSIZE*13(sp)
            sd a5, REGSIZE*14(sp)
            sd a6, REGSIZE*15(sp)
            sd a7, REGSIZE*16(sp)
            sd s2, REGSIZE*17(sp)
            sd s3, REGSIZE*18(sp)
            sd s4, REGSIZE*19(sp)
            sd s5, REGSIZE*20(sp)
            sd s6, REGSIZE*21(sp)
            sd s7, REGSIZE*22(sp)
            sd s8, REGSIZE*23(sp)
            sd s9, REGSIZE*24(sp)
            sd s10, REGSIZE*25(sp)
            sd s11, REGSIZE*26(sp)
            sd t3, REGSIZE*27(sp)
            sd t4, REGSIZE*28(sp)
            sd t5, REGSIZE*29(sp)
            sd t6, REGSIZE*30(sp)
        ",
        // set parameters of kernel_trap
        // bug: do not use la a0, sp
        // we should use addi a0, sp, 0 or add a0, x0, sp
        r"
            csrr t0, sepc
            csrr t1, sstatus
            sd t0, REGSIZE*31(sp)
            sd t1, REGSIZE*32(sp)
            add a0, x0, sp
            csrr a1, scause
            csrr a2, stval

            call kernel_trap
        ",
        // restore context
        r"
            ld t0, REGSIZE*31(sp)
            ld t1, REGSIZE*32(sp)
            csrw sepc, t0
            csrw sstatus, t1

            ld ra, REGSIZE*0(sp)
            ld sp, REGSIZE*1(sp)
            ld gp, REGSIZE*2(sp)
            ld tp, REGSIZE*3(sp)
            ld t0, REGSIZE*4(sp)
            ld t1, REGSIZE*5(sp)
            ld t2, REGSIZE*6(sp)
            ld s0, REGSIZE*7(sp)
            ld s1, REGSIZE*8(sp)
            ld a0, REGSIZE*9(sp)
            ld a1, REGSIZE*10(sp)
            ld a2, REGSIZE*11(sp)
            ld a3, REGSIZE*12(sp)
            ld a4, REGSIZE*13(sp)
            ld a5, REGSIZE*14(sp)
            ld a6, REGSIZE*15(sp)
            ld a7, REGSIZE*16(sp)
            ld s2, REGSIZE*17(sp)
            ld s3, REGSIZE*18(sp)
            ld s4, REGSIZE*19(sp)
            ld s5, REGSIZE*20(sp)
            ld s6, REGSIZE*21(sp)
            ld s7, REGSIZE*22(sp)
            ld s8, REGSIZE*23(sp)
            ld s9, REGSIZE*24(sp)
            ld s10, REGSIZE*25(sp)
            ld s11, REGSIZE*26(sp)
            ld t3, REGSIZE*27(sp)
            ld t4, REGSIZE*28(sp)
            ld t5, REGSIZE*29(sp)
            ld t6, REGSIZE*30(sp)

            addi sp, sp, REGSIZE*CONTEXTREGS
            
            sret
        ",
        options(noreturn),
    )
}
```

由于调用函数时保存参数的寄存器为 `a0~a7`，于是，我们按照汇编写的顺序进行 `kernel_trap` 参数的设置：

```rust
#[no_mangle]
fn kernel_trap(context: &mut Context, scause: Scause, stval: usize) -> usize {
    let mut sepc = context.sepc;
    let sstatus = context.sstatus;

    assert_ne!(sstatus & SSTAUS_SPP, 0);

    log::warn!(
        "Kernel Interrupt Occured: irq-{:#x}: {:?}, sepc: {:#x}, stval: {:#x}",
        scause.bits(),
        scause.cause(),
        sepc,
        stval
    );

    match scause.cause() {
	    Trap::Interrupt(Interrupt::SupervisorTimer) => {
            log::warn!("Supervisor Timer Interrupt");
            shutdown()
        }
        Trap::Exception(Exception::Breakpoint) => {
            sepc += 2;
            context.sepc = sepc;
        }
        _ => log::error!(
            "Unknown Interrupt: irq-{:#x}, sepc: {:#x}, stval: {:#x}",
            scause.bits(),
            sepc,
            stval
        ),
    }
    context as *const Context as usize
}
```

现在，我们就可以在 `init_intr` 中进行初始化与测试：

我们需要把 `kernelvec` 写入作为异常处理向量的基地址写入 `stvec` 寄存器中，这样，当陷入异常时就会自动跳入到 `stvec` 指向的地址。

```rust
pub fn init_intr() {
    unsafe {
        stvec::write(kernelvec as usize, stvec::TrapMode::Direct);
        log::info!("set stvec to 0x{:x}", kernelvec as usize);
        log::debug!("test ebreak exception");

        asm!("ebreak");
    }
}
```

我们测试如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202404152112836.png)

注意 `[WARN]` 的输出，可以发现已经成功开启了中断并进入了中断处理（因为正常返回了）

# 时钟中断

我们在 `timer.rs` 中进行实现（注意，我们暂时并不实现机器级别的时钟中断，只关注OS级别的，因此我们设置的为 `sie` 寄存器）


```rust
use riscv::register::{sie, sstatus};

use crate::{set_timer, TIME_INTERVAL};

/// See more in https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/start.c#L8

pub fn timerinit() {
    unsafe {
        sie::set_stimer();
        sstatus::set_sie();
    };
    set_timer(TIME_INTERVAL);
    log::info!("Time interrupt initialized");
}

```

> 此处的 `set_timer` 是 `sbi` 中实现的

测试结果如下：

> 请注意，需要将 `main.rs` 中的 `shutdown()` 改为 `loop{}`

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202404152136156.png)
