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
description:
---
> 此提交的 hash 为 eaf48515c946501df450dadf40b5ca997aa77488
> 如果想阅读代码，请运行 `git checkout <hash>`

# 启动流程

启动的大致流程如下：

1. 加电自检
2. 进入 `bios` 自检
3. 跳转到内核起始地址

由于我们在现阶段并不考虑自己的 `bootloader`，因此可以直接使用 `qemu` 自带的 `opensbi` 作为 `bios`

而由于 `opensbi` 在自检并设置完成后，跳转的第一个地址为 `0x80200000`，因此，我们只需要通过链接脚本将 `kernel` 链接到这里即可。

那么，我们考虑 `makefile` 如下：

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

# 代码

上面已经确定了程序的入口为函数 `_entry`，因此，我们在 `arch/riscv64/entry.asm` 中进行编写。

一个内核的简单启动流程如下：
1. 分配栈
2. 跳转到 `kmain`

于是，`entry.asm` 如下所示：
```assembly
.section .text.entry
    .globl _entry
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

在 `arch/riscv64/sbi.rs` 中进行封装后，我们在 `modules/logger` 中利用 `log` 包完成一个自定义的日志库，并将其应用到整个项目中。

这样，我们就可以启动内核了，其结果如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202403042208831.png)

