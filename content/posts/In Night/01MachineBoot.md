---
title: SparrOS：A Toy OS 0x01
math: true
date: 2024-04-14 11:24:11
keywords:
  - OS
  - NENU
categories:
  - InNight
  - OS
cover: wallpaper/20230803165920.png
draft: true
description:
---
> 此提交的 `hash` 为 `eaf48515c946501df450dadf40b5ca997aa77488`，如果想阅读代码，请运行 `git checkout <hash>`
# 机器启动

一个计算器的启动大致流程如下：
1. 加电自检
2. 进入 `bios` 自检
3. 跳转到内核起始地址

关于这个启动流程，可以参照：
1. [RISC-V OS using Rust](https://osblog.stephenmarz.com/)
2. [os-dev](https://wiki.osdev.org/Main_Page)

由于我们在现阶段并不考虑自己的 `bootloader`，因此可以直接使用 `qemu` 自带的 `opensbi` 作为 `bios`

而由于 `opensbi` 在自检并设置完成后，跳转的第一个地址为 `0x80200000`，因此，我们只需要通过链接脚本将 `kernel` 链接到这里即可。

> 关于链接的部分，如果想知道更多的细节，推荐看一看《程序员的自我修养--链接与装载》这本书

那么，我们考虑 `Makefile` 如下：

```makefile
ARCH := riscv64
TARGET := $(ARCH)gc-unknown-none-elf
KERNEL := target/$(TARGET)/release/sparros
LOG := INFO

QEMU_ARGS := -machine virt \
			-nographic \
			-m 128M \
			-smp 2 \
			-kernel $(KERNEL)

env:
	(rustup target list | grep "riscv64gc-unknown-none-elf (installed)") || rustup target add $(TARGET)
	cargo install cargo-binutils
	rustup component add rust-src
	rustup component add llvm-tools-preview

build: 
	@echo "Building..."
	@LOG=$(LOG) cargo build  --release

qemu: build
	@LOG=$(LOG) qemu-system-$(ARCH) $(QEMU_ARGS)

gdb-server: build
	@qemu-system-$(ARCH) $(QEMU_ARGS) -s -S

gdb: gdb-server
	@riscv64-linux-elf-gdb

```

> 这部分在后续会进行更改，主要是 `QEMU` 的运行参数

我们对 `QEMU` 的参数进行解释：
1. `-machine virt` 表示模拟的机器型号为 `virt`，这也是最常用的型号，大多数机型都会兼容（虽然现阶段我们并不需要了解太多这个参数）
2. `-nographic` 表示不需要图形界面（否则会出现类似 `vga` 这种，也就是 `blogOS` 中第二章交的怎么在 `VGA` 里显示字符）
	受 `xv6` 影响较深，我认为一个简单的 `OS` 在起步阶段并不需要关系图形界面，应该更多的关注到 `OS` 最核心的那部分内容
3. `-m 128M` 表示可运行内存（也就是 RAM）的大小为 `128M`，在后面可能会增长到 `512M` 或更大
4. `-smp 2` 表示这是个多核的及其，有两个 `CPU` 核
5. `-kernel $(KERNEL)` 表示加载的内核为上方定义的 `KERNEL` 文件

而链接脚本如下：

```ld
OUTPUT_ARCH( riscv )
ENTRY( _entry )

BASE_ADDRESS = 0x80200000;

SECTIONS
{
    /* Load the kernel at this address: "." means the current address */
    . = BASE_ADDRESS;
    start = .;

    .text ALIGN(4K): {
        stext = .;
        *(.text.entry)
        *(.text .text.*)
        . = ALIGN(4K);
        etext = .;
    }

    .rodata : {
        srodata = .;
        *(.rodata .rodata.*)
        . = ALIGN(4K);
        erodata = .;
    }

    .data : {
        . = ALIGN(4K);
        *(.data.prepage)
        sdata = .;
        *(.data .data.*)
        *(.sdata .sdata.*)
        edata = .;
    }

    .stack : {
        *(.bss.stack)
    }

    .bss : {
        *(.bss.stack)
        sbss = .;
        *(.bss .bss.*)
        *(.sbss .sbss.*)
        ebss = .;
    }

    PROVIDE(end = .);
}
```

在这里我们也可以选择不对齐（对齐是为了后续的内存地址映射考虑）

# 内核启动

上面已经确定了程序的入口为函数 `_entry`，因此，我们在 `arch/riscv64/entry.asm` 中进行编写。

一个内核的简单启动流程如下：
1. 分配内核栈
2. 跳转到 `kmain`

于是，`entry.asm` 如下所示：

```assembly
.section .text.entry
    .global _entry
_entry:
    la sp, bootstacktop
    call kmain

    .section .bss.stack
    .align 12   # page align
    .global bootstack
bootstack:
    .space 4096 * 4 * 8
    .global bootstacktop
bootstacktop:
```

重点在于 `.global _entry` 与 `_entry:` 这一段，先前的链接脚本会把程序的入口点（也就是内核的入口点），`0x8020_0000` 这个地址的汇编指令设置为 `_entry` 的第一行指令

这样，我们就把控制权移交给了 `Rust` 代码，在 `arch/riscv64/mod.rs` 中，我们的代码如下：

```rust
#[no_mangle]
pub extern "C" fn kmain(hart_id: usize) {
    extern "Rust" {
        fn main(hart_id: usize);
    }

    unsafe {
        main(hart_id);
    }

    unreachable!();
}
```

于是，我们就可以在 `kernel/src/main.rs` 中进行我们内核的启动了

```rust
#[no_mangle]
pub unsafe fn main(hart_id: usize) -> ! {
    if hart_id != 0 {
        loop {}
    }
    // initialize logging module
    extern "C" {
        fn stext();
        fn etext();
        fn srodata();
        fn erodata();
        fn sdata();
        fn edata();
        fn sbss();
        fn ebss();
    }

    clear_bss();

    println!("Hello Sparrow OS!");

    loop {}
}

#[panic_handler]
pub unsafe fn panic(info: &core::panic::PanicInfo) -> ! {
    log::error!("kernel panic at {}", info.location().unwrap());
    asm!("wfi");
    unreachable_unchecked();
}

```

但我们在这里依然无法启动，我们缺少输出的接口，因此无法进行 `println`，在这里，我们还需要对 `sbi` 进行封装，这样才能进行基本的输入输出，我们使用 `sbi-rt` 这个库进行封装。

> 更新：对于这里的 `sbi-rt` 包，由于已经不维护了，因此我们采取了自己写一个 `sbi.rs` 进行 `sbi` 的封装：

```rust
#![allow(unused)]

use core::arch::asm;

const SBI_SET_TIMER: usize = 0;
const SBI_CONSOLE_PUT_CHAR: usize = 1;
const SBI_CONSOLE_GET_CHAR: usize = 2;
const SBI_CLEAR_IPI: usize = 3;
const SBI_SEND_IPI: usize = 4;
const SBI_REMOTE_FENCE_I: usize = 5;
const SBI_REMOTE_SFENCE_VMA: usize = 6;
const SBI_REMOTE_SFENCE_VMA_ASID: usize = 7;
const SBI_SHUTDOWN: usize = 8;

// SBI 调用
fn sbi_call(which: usize, arg0: usize, arg1: usize, arg2: usize) -> i32 {
    let mut ret;
    unsafe {
        asm!("ecall",
        in("a7") which,
        inlateout("a0") arg0 as i32 => ret,
        in("a1") arg1,
        in("a2") arg2);
    }
    ret
}

/// 设置定时器
pub fn set_timer(time: usize) {
    sbi_call(SBI_SET_TIMER, time, 0, 0);
}

/// 输出一个字符到屏幕
pub fn console_putchar(ch: u8) {
    sbi_call(SBI_CONSOLE_PUT_CHAR, ch as usize, 0, 0);
}

/// 获取输入
pub fn console_getchar() -> char {
    sbi_call(SBI_CONSOLE_GET_CHAR, 0, 0, 0) as u8 as char
}

/// 调用 SBI_SHUTDOWN 来关闭操作系统（直接退出 QEMU）
pub fn shutdown() -> ! {
    sbi_call(SBI_SHUTDOWN, 0, 0, 0);
    unreachable!()
}

#[repr(C)]
pub struct SbiRet {
    /// Error number
    pub error: usize,
    /// Result value
    pub value: usize,
}

pub const EXTENSION_BASE: usize = 0x10;
pub const EXTENSION_TIMER: usize = 0x54494D45;
pub const EXTENSION_IPI: usize = 0x735049;
pub const EXTENSION_RFENCE: usize = 0x52464E43;
pub const EXTENSION_HSM: usize = 0x48534D;
pub const EXTENSION_SRST: usize = 0x53525354;

const FUNCTION_HSM_HART_START: usize = 0x0;
const FUNCTION_HSM_HART_STOP: usize = 0x1;
const FUNCTION_HSM_HART_GET_STATUS: usize = 0x2;
const FUNCTION_HSM_HART_SUSPEND: usize = 0x3;

#[inline(always)]
fn sbi_call_3(extension: usize, function: usize, arg0: usize, arg1: usize, arg2: usize) -> SbiRet {
    let (error, value);
    unsafe {
        asm!(
            "ecall",
            in("a0") arg0, in("a1") arg1, in("a2") arg2,
            in("a6") function, in("a7") extension,
            lateout("a0") error, lateout("a1") value,
        )
    }
    SbiRet { error, value }
}

pub fn hart_suspend(suspend_type: u32, resume_addr: usize, opaque: usize) -> SbiRet {
    sbi_call_3(
        EXTENSION_HSM,
        FUNCTION_HSM_HART_SUSPEND,
        suspend_type as usize,
        resume_addr,
        opaque,
    )
}

```

> 当然，也可以使用  `rust-sbi` 这个包，但是他的文档没有示例，写起来会比较麻烦。

完成了 `console_putchar` 的实现后，我们就可以实现 `println` 这个宏，我们在 `modules/logger` 中利用 `log` 包完成一个自定义的日志库，并将其应用到整个项目中

```bash
cd modules
cargo init logger --lib

```

当然，我们需要在根目录的 `Cargo.toml` 中添加工作区依赖，并在 `kernel/Cargo.toml` 的 `[dependencies]` 中添加内容如下：

```toml
[dependencies]
log = "0.4.21"
libarch = { workspace = true }
logger = { workspace = true }
```

> 这里需要引入 `log`，否则无法在 `kernel/main.rs` 中使用 `info!` 此类宏。

而对于 `logger` 的实现，可以参照 [rCore-ch1-exercies](https://rcore-os.cn/rCore-Tutorial-Book-v3/chapter1/7exercise.html) 中的日志部分，而目前的 `rCore` 已经把第一章的练习设置为已实现状态，可以直接套用过来。

# 最终结果

一切就绪后，我们就可以启动内核了，其结果如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202403042208831.png)

