---
title: "SparrOS: A Toy OS 0x03"
math: true
date: 2024-04-14 22:15:13
keywords:
  - NENU
  - OS
categories:
  - InNight
  - OS
cover: wallpaper/117165405_p1.png
description:
---
> 此提交的 `hash` 为 `9832ebba1e4248f0b3b381735ae5caccbcadbce4`
> 输入 `git checkout <commit-hash>` 进行查看

这部分由两个内容组成：
1. 内存分配
2. 页帧分配
# 内存分配器

由于 `Rust` 的 `alloc` 特性提供了内存分配的 API。在提供了标准库的程序里都会有一个全局的内存分配器来进行内存分配，而在 no_std 的环境下，只要我们实现了 `alloc` 特性并提供了全局的内存分配器，我们就可以使用 `Box` 或者 `Vec` 等智能指针。

关于内存分配器的选择有很多，主流的有如下几种：

1. 链表分配器（简单而言就是维护空闲链表和脏页面的链表）
2. `Buddy System` + `SLAB`：其中前者负责大内存的分配，后者负责小内存的分配，这种架构在 `chcore` 中有使用
3. `SLUT` （`SLAB` 的升级版本）

我选择的内存分配器为 `tlfs`，全称为：Two-Level Segregated Fit。论文的地址为：[Two-Level Segregated Fit](https://ieeexplore.ieee.org/document/1311009) 

关于这个分配器的解读，请看 [TLSF解读](tlsf-reading.md)

> 更新：直接使用了 [Talc](https://github.com/SFBdragon/talc) 这个内存分配器（因为自带全局功能，如果使用 `rlsf` 还需要自己实现，我的 `Rust` 水平不允许我这么做，但后面应该会进行重构

测试代码如下：

```rust
kalloc::init();

let mut vec: Vec<u32> = Vec::new();
assert_eq!(vec.len(), 0);
vec.push(114514);
assert_eq!(vec.len(), 1);
log::debug!("Allocator works successfully");
log::debug!("vector address is 0x{:x}", vec.as_ptr() as usize);
```

测试结果如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202404112303179.png)

#  页帧分配

对于页帧分配和内存分配的概念，我们需要有一个明确的认知：

> 一个操作系统内核有了内存分配器，为什么还需要页帧分配器?
> 内存分配器和页帧分配器是操作系统内核中两个不同的概念，它们在内存管理的不同层次上发挥作用。
> 
> 内存分配器（Memory Allocator）是负责在进程的虚拟地址空间中分配和释放内存块的组件。它通常以字节为单位进行分配，可以为进程动态地分配变量、数据结构和堆栈等。内存分配器的目标是尽可能高效地管理进程的虚拟地址空间，以满足进程的内存需求。
> 
> 而页帧分配器（Page Frame Allocator）则是负责在物理内存中分配和释放页帧（Page Frame）的组件。页帧是固定大小的物理内存块，通常是操作系统和硬件直接管理的最小内存单位。页帧分配器的任务是跟踪物理内存的使用情况，并为进程分配所需的物理页帧，以及在不需要时回收已使用的页帧。
> 
> 虽然内存分配器能够管理进程的虚拟地址空间，但它并不直接操作物理内存。相反，它在需要时向页帧分配器请求物理页帧，并将其映射到进程的虚拟地址空间中。这种分层的内存管理模型有以下几个原因：
> 
> 1. 虚拟内存管理：内存分配器负责管理进程的虚拟地址空间，提供灵活的内存分配和释放功能。虚拟内存允许进程使用比实际可用物理内存更大的地址空间，并提供了内存隔离和保护机制。页帧分配器则负责处理虚拟内存和物理内存之间的映射关系。
> 
> 2. 物理内存管理：页帧分配器负责管理物理内存，维护物理页帧的分配和释放状态。它需要跟踪哪些页帧已被占用，哪些是空闲的，并能够高效地分配和回收物理页帧。这对于操作系统来说是非常重要的，因为它需要管理多个进程的物理内存需求。
> 
> 内存保护和隔离：页帧分配器可以通过分配物理页帧的方式来实现内存保护和隔离。不同的页帧可以分配给不同的进程，从而确保它们之间的内存访问相互隔离。页帧分配器还可以为特定的页帧设置访问权限，以实现内存保护机制，例如只读、读写等。
> 
> 因此，尽管内存分配器能够管理进程的虚拟地址空间，但页帧分配器在操作系统内核中仍然起着重要的作用。两者合作协同，实现了对进程的灵活内存管理和对物理内存的有效分配与回收。

简而言之，页帧分配器是和物理地址打交道，也就是直接面向 `RAM` 编程

## 设备树

> 此提交的 `hash` 为 `140175d95f77cd612f9cc2271f4e34caeaf7d2d0` 
> 输入 `git checkout <commit-hash>` 进行查看

关于设备树的更多，可以查看 [rCore-device-tree](https://rcore-os.cn/rCore-Tutorial-Book-v3/chapter9/2device-driver-0.html) 中的介绍，简单来说：

设备树（Device Tree）是一种数据结构，用于表示硬件系统的结构和功能。 它是一个文本文件，描述了硬件系统的结构和功能，并将这些信息提供给操作系统。设备树包含了关于硬件系统的信息，如：

- 处理器的类型和数量
- 板载设备（如存储器、网卡、显卡等）的类型和数量
- 硬件接口（如 I2C、SPI、UART 等）的类型和地址信息

设备树中的节点是用来描述硬件设备的信息的。 一个设备树节点包含了一个或多个属性，每个属性都是一个键-值对，用来描述设备的某一特定信息。而操作系统就是通过这些节点上的信息来实现对设备的识别和初始化。具体而言，一个设备节点上会有一些常见的属性：

- compatible：表示设备的类型，可以是设备的厂商名、产品名等，如 “virtio,mmio” 指的是这个设备通过 virtio 协议、MMIO（内存映射 I/O）方式来驱动
- reg：表示设备在系统中的地址空间位置
- interrupts：表示设备支持的中断信号

设备树在很多嵌入式系统中都得到了广泛应用，它是一种常用的方法，用于将硬件（特别是外设）信息传递给操作系统。在桌面和服务器系统中，PCI总线可以起到设备树的作用，通过访问PCI总线上特定地址空间，也可以遍历出具有挂在PCI总线上的各种PCI设备。

我们使用设备树来获取 `RAM` 及其物理内存区域，这里使用的是 `fdt` 包，但首先，我们先实现关于 `Physical Page` 和 `Virtual Page` 的设定：

```rust
/// Physical address
#[derive(Clone, Copy, PartialEq, Eq, Debug, PartialOrd, Ord)]
pub struct PhysicalAddr(usize);

/// Virtual address
#[derive(Clone, Copy, PartialEq, Eq, Debug, PartialOrd, Ord)]
pub struct VirtualAddr(usize);

/// Physical page
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct PhysicalPage(usize);

/// Virtual page
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct VirtualPage(usize);

/// Page Table Entry Flags
pub mod pte_flags {
    /// PTE_V (Page Table Entry Valid): Indicates whether the PTE is present and valid.
    pub const PTE_V: usize = 1 << 0;
    /// PTE_R (Page Table Entry Read): Controls whether instructions are allowed to read the page.
    pub const PTE_R: usize = 1 << 1;
    /// PTE_W (Page Table Entry Write): Controls whether instructions are allowed to write to the page.
    pub const PTE_W: usize = 1 << 2;
    /// PTE_X (Page Table Entry Execute): Controls whether the CPU can execute the content of the page as instructions.
    pub const PTE_X: usize = 1 << 3;
    /// PTE_U (Page Table Entry User): Controls whether user-mode instructions are allowed to access the page.
    pub const PTE_U: usize = 1 << 4;
    /// PTE_G (Page Table Entry Global): Indicates that the page is global, meaning the translation is effective in all address spaces. Global pages don't get flushed from the TLB on an address space switch.
    pub const PTE_G: usize = 1 << 5;
    /// PTE_A (Page Table Entry Accessed): This flag is set by the hardware when the page is accessed (read or write). The OS can use this to implement page replacement algorithms.
    pub const PTE_A: usize = 1 << 6;
    /// PTE_D (Page Table Entry Dirty): This flag is set by the hardware when the page is written to. The OS can use this to track which pages have been modified and need to be written back to disk.
    pub const PTE_D: usize = 1 << 7;
}
```

关于如何从 `va` 转化到 `pa`，参照下图：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202404132230272.png)

请注意上图中的数字（例如 `Offset` 为 `12`）

> 上面只是分页的一些前置设置，关于页帧分配的实现我们在下一节中提及

现在，我们需要初始化我们的 `RAM`，我们引入 `fdt`，并在 `device/memlayout.rs` 中获取 `RAM` ，但首先我们在 `device/lib.rs` 中初始化设备树：

```rust
pub static DEVICES_TREE_ADDR: AtomicUsize = AtomicUsize::new(0);

pub fn init(device_tree: usize) {
    DEVICES_TREE_ADDR.store(device_tree, Ordering::Relaxed);
    let fdt = unsafe { fdt::Fdt::from_ptr(device_tree as *const u8).unwrap() };
    log::info!("The device tree represents as {}", fdt.root().model());
    log::info!(
        "which has {} memory regions",
        fdt.memory().regions().count()
    );
    log::info!(
        "\t and compatible with at least {}",
        fdt.root().compatible().first()
    );
    log::info!("\t and has {} cpu cores", fdt.cpus().count());

    fdt.memory().regions().for_each(|m| {
        log::debug!(
            "memory region: [{:#x}, {:#x})",
            m.starting_address as usize,
            m.starting_address as usize + m.size.unwrap_or(0)
        )
    });

    let chosen = fdt.chosen();
    if let Some(bootargs) = chosen.bootargs() {
        log::info!("The bootargs are: {:?}", bootargs);
    }

    if let Some(stdout) = chosen.stdout() {
        log::info!("It would write stdout to: {}", stdout.name);
    }

    fdt.all_nodes().for_each(|n| {
        if let Some(compatible) = n.compatible() {
            log::info!("{} has compatible: {:?}", n.name, compatible.first());
        }
    });
    log::info!("Device tree initialized");
}
```

当设备树初始化后，我们就可以获取 `RAM` 的物理地址了：

```rust
use crate::DEVICES_TREE_ADDR;

/// Memory Region
/// Representing as [start, end)
pub struct MemoryRegion {
    pub start: usize,
    pub end: usize,
}

pub fn get_ram() -> Vec<MemoryRegion> {
    let mut memorys: Vec<MemoryRegion> = vec![];
    let fdt = unsafe {
        fdt::Fdt::from_ptr(DEVICES_TREE_ADDR.load(Ordering::Relaxed) as *const u8).unwrap()
    };
    fdt.memory().regions().for_each(|m| {
        memorys.push(MemoryRegion {
            start: m.starting_address as usize,
            end: m.starting_address as usize + m.size.unwrap_or(0),
        });
    });
    memorys
}
```

获取了 `RAM` 的物理地址后，我们在 `pagetable` 中的 `init` 中进行调用（因为我们需要将 `RAM` 区域进行分割，分割为一个个页帧才行）

```rust
pub fn init() {
    extern "C" {
        fn end();
    }
    let physical_addr_end = floor(end as usize - VIRT_ADDR_START, PAGE_SIZE) * PAGE_SIZE;
    let memorys = get_ram();
    log::debug!(
        "The physical address end of kernel is {:#x}",
        physical_addr_end
    );
    memorys.iter().for_each(|m| {
        if physical_addr_end > m.start && physical_addr_end < m.end {
            log::debug!(
                "Adding memory into page frame allocator\n Memory Region is [{:#x}, {:#x})",
                m.start,
                m.end
            );
        }
    });
    log::info!("Page table and Page frame allocator initialized");
}
```

在 `kernel/main.rs` 中添加上面两个 `init` 函数后，可以发现 `RAM` 的物理地址为: `[0x80000000, 0xa0000000)` 
恰好为 `512MB` 

## 页帧分配器

> 此提交的 `hash` 为 `068d3f21097d73e20c0ecbdc7af1f904886ea33a`

我们在这里对页帧分配器需要实现的功能做一个简单的介绍：

1. 对 `RAM` 中的页帧需要追踪其是否被使用
2. 能够快速分配物理页
3. 能够回收分配出去的物理页

显然，我们需要至少三个数据结构：
1. 被使用的物理页（或者说被分配出去的物理页）
2. 追踪页帧是否被使用的管理器
3. 分配器
分配器应该是包含多个管理器的，每个管理器可以管理一整个内存区域（因为可能有多块 `RAM`）

对于管理器，我们需要知道：
1. 如何快速知道某个页面是否被使用（给定一个物理地址，如何知道其已被使用）
2. 管理器管理的起始物理地址
3. 管理器管理的终止物理地址

而被使用的物理页显然可以使用先前定义的 `Physical Page` 进行替代

对于管理器，我们采用位图的方式进行管理页帧，理由是可以在 `O(1)` 时间内进行查找和修改

定义如下：

```rust
/// Page Frame Map
/// We use a bitmap to manage the page frame
/// The bitmap is a vector of usize to indicate the status of each page frame
/// We use PhysicalPage to indicate the physical address:
/// 1. ppn_start stands for the start address of the page frame in this bitmap manager
/// 2. ppn_end stands for the end address of the page frame in this bitmap manager
/// In bitmaps, `1` stands for free and `0` stands for used
pub struct FrameMap {
    free_frame: Vec<usize>,
    ppn_start: PhysicalPage,
    ppn_end: PhysicalPage,
}
```

那么分配器就很显然为：

```rust
/// A global page frame allocator
pub struct FrameAllocator(pub Vec<FrameMap>);
```

显然，我们必须实现的函数就是：
1. `alloc`
2. `dealloc`

> 实现是简单的，只要设置位图就可以

一个全局分配器如下：

```rust
pub static FRAME_ALLOCATOR: Mutex<FrameAllocator> = Mutex::new(FrameAllocator::new());
```

注意这里我们使用了 `sync` 中的 `Mutex`，这是个自旋锁，可以保证多线程安全（虽然现在也只有一个线程）

# 总结

最后的成果为：`LOG=DEBUG cargo run`

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202404132314258.png)
