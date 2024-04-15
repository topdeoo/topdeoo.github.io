---
title: "SparrOS: A Toy OS 0x02"
math: true
date: 2024-04-14 21:44:39
keywords:
  - OS
  - NENU
categories:
  - InNight
  - OS
cover: wallpaper/117165405_p0.png
description:
---
>此提交的hash为 d571835f4c719a3e93092b0330a966077c0c9c20
>如果想查看代码，请输入 `git checkout <hash>`

# 内核高半核

内核高半核（`Kernel High Half` ）意思是内核空间和用户空间是分开的，各自拥有独立的虚拟地址空间。用户空间用于运行用户应用程序，而内核空间用于运行操作系统内核代码。内核空间通常位于虚拟地址空间的高地址部分，而用户空间位于虚拟地址空间的低地址部分。

本质上就是一个内存的映射，我们在这里将 `0xffffffff_c0000000` 映射到 `0x00000000_80000000`

于是，我们修改链接脚本如下：

```ld
OUTPUT_ARCH( riscv )
ENTRY( _entry )

KERNEL_VA = 0xffffffffc0200000;
KERNEL_PA = 0x80200000;

SECTIONS
{
    /* Load the kernel at this address: "." means the current address */
    . = KERNEL_VA;
    start = .;

    .text ALIGN(4K): AT(KERNEL_PA) {
        stext = .;
        *(.text.entry)
        _copy_user_start = .;
        *(.text.copy_user)
        _copy_user_end = .;
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

随后，我们删除 `entry.asm`，使用 `entry.rs` 与裸函数作为替代，并启动虚拟内存，如下所示：

```rust
use core::arch::asm;

#[naked]
#[no_mangle]
#[link_section = ".text.entry"]
unsafe extern "C" fn _entry() {

    const BOOTSTACK_SIZE: usize = 4096 * 4 * 8;
    const PAGE_SIZE: usize = 512;

    #[link_section = ".bss.stack"]
    static mut BOOTSTACK: [u8; BOOTSTACK_SIZE] = [0u8; BOOTSTACK_SIZE];

    #[link_section = ".data.prepage"]
    static mut PAGE_TABLE: [usize; PAGE_SIZE] = {
        let mut item: [usize; PAGE_SIZE] = [0usize; PAGE_SIZE];
        item[2] = (0x800_00 << 10) | 0xcf;
        item[511] = (0x800_00 << 10) | 0xcf;
        item 
    };

    asm!(
        "   add t0, a0, 1
            slli t0, t0, 14
            lui sp, %hi({stack})
            add sp, sp, t0 ",
        "   lui     t0, %hi({pgt})
            li      t1, 0xffffffffc0000000 - 0x80000000
            sub     t0, t0, t1
            srli    t0, t0, 12
            li      t1, 8 << 60
            or      t0, t0, t1
            csrw    satp, t0
            sfence.vma ",
        "   lui t0, %hi(kmain)
            addi t0, t0, %lo(kmain)
            jr t0 ",
        stack   = sym BOOTSTACK,
        pgt     = sym PAGE_TABLE,
        options(noreturn)
    )
}

```

以下内容来自于 `GPT`，本人稍加一些修改：

这段代码主要进行了以下几个步骤:

1. 定义静态全局变量 `BOOTSTACK`:
   ```rust
   #[link_section = ".bss.stack"]
   static mut BOOTSTACK: [u8; BOOTSTACK_SIZE] = [0u8; BOOTSTACK_SIZE];
   ```
   - `#[link_section = ".bss.stack"]` 属性指定了这个变量应该被链接到 `.bss.stack` 段中。这样做可以确保这个变量被放置在与栈相关的内存区域。
   - `static mut BOOTSTACK: [u8; BOOTSTACK_SIZE] = [0u8; BOOTSTACK_SIZE];` 定义了一个大小为 `BOOTSTACK_SIZE` 的 `u8` 类型数组。这个数组就是用作启动阶段的栈空间。

2. 定义静态全局变量 `PAGE_TABLE`:
   ```rust
   #[link_section = ".data.prepage"]
   static mut PAGE_TABLE: [usize; PAGE_SIZE] = {
       let mut item: [usize; PAGE_SIZE] = [0usize; PAGE_SIZE];
       item[2] = (0x800_00 << 10) | 0xcf;
       item[511] = (0x800_00 << 10) | 0xcf;
       item
   };
   ```
   - `#[link_section = ".data.prepage"]` 属性指定了这个变量应该被链接到 `.data.prepage` 段中。这样做可以确保这个变量在程序启动时就已经被加载到内存中。
   - `static mut PAGE_TABLE: [usize; PAGE_SIZE] = { ... }` 定义了一个大小为 `PAGE_SIZE` 的 `usize` 类型数组,用作页表。
   - 在初始化过程中,手动设置了 `item[2]` 和 `item[511]` 的值。这两个页表项分别映射到物理地址 `0x800_00` 和 `0x800_00` 处的内存页,并设置了相应的访问权限标志位：
	- RISC-V 中,每个页表项都是 64 位(8字节)的数据结构。其中
		- 高 54 位存放页帧号(物理页号)
		- 低 10 位存放页表项的属性标志位
	  - `0x800_00 << 10` 就是将物理页号 `0x800_00` 左移 10 位,得到 54 位的页帧号。
	  - `0xcf` 是页表项的属性标志位,具体含义如下:
		   - bit 0: 有效位,表示该页表项有效
		   - bit 1: 读权限
		   - bit 2: 写权限 
		   - bit 3: 执行权限
		   - bit 4: 用户权限(U位)
		   - bit 5: 访问位
		   - bit 6: 脏位
		   - bit 7: 全局位

所以,这两个页表项都映射到物理地址 `0x800_00` 处的内存页,并且设置了读、写、执行和用户权限。

3. 使用内联汇编进行启动初始化:
   ```rust
   asm!(
       "   add t0, a0, 1
           slli t0, t0, 14
           lui sp, %hi({stack})
           add sp, sp, t0 ",
       "   lui     t0, %hi({pgt})
           li      t1, 0xffffffffc0000000 - 0x80000000
           sub     t0, t0, t1
           srli    t0, t0, 12
           li      t1, 8 << 60
           or      t0, t0, t1
           csrw    satp, t0
           sfence.vma ",
       "   lui t0, %hi(kmain)
           addi t0, t0, %lo(kmain)
           jr t0 ",
       stack   = sym BOOTSTACK,
       pgt     = sym PAGE_TABLE,
       options(noreturn)
   )
   ```
   - 第一个汇编块设置了栈指针 `sp` 的初始值。它将 `a0` 寄存器的值加 1,然后将结果左移 14 位(相当于乘以 16384),最后将结果加到 `sp` 的高 16 位上，这样就将栈顶指针设置到了 `BOOTSTACK` 的末尾。
   - 第二个汇编块设置了页表基址寄存器 `satp`。它先将 `PAGE_TABLE` 的地址加载到 `t0` 寄存器,然后计算出页表基址的物理地址,最后将其写入 `satp` 寄存器。并执行了 `sfence.vma` 指令,使新的页表配置生效。
   - 第三个汇编块跳转到 `kmain` 函数。这个函数应该是内核的主入口点,在这里开始执行内核的启动逻辑。

总的来说,这段代码完成了以下工作:

1. 定义了启动阶段使用的栈空间和页表。
2. 使用内联汇编初始化了栈指针和页表,为内核后续的执行做好准备。
3. 最终跳转到内核的主入口点 `kmain` 函数,开始执行内核的启动逻辑。

# 最终结果

而其余的代码不变，这样，通过 `qemu` 启动后如图所示：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202403042214739.png)

可以发现，内核已经启用了虚拟地址，且被分配到了高半核上去（也就是地址前面全是 `ffffffff` ）
