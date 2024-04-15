---
title: "SparrOS: A Toy OS 0x05"
math: true
date: 2024-04-15T21:29:01+08:00
keywords:
  - NENU
  - OS
categories:
  - OS
  - InNight
cover: wallpaper/117165573_p2.png
description:
---

# 设备树

有关设备树的内容，我们在 [虚拟内存](03MemoryAllocator.md#设备树) 中已经提过，我们模仿 `rCore` 中的步骤，输出虚拟机 `virt` 的设备树如下：

```bash
/dts-v1/;

/ {
	#address-cells = <0x02>;
	#size-cells = <0x02>;
	compatible = "riscv-virtio";
	model = "riscv-virtio,qemu";

	poweroff {
		value = <0x5555>;
		offset = <0x00>;
		regmap = <0x04>;
		compatible = "syscon-poweroff";
	};

	reboot {
		value = <0x7777>;
		offset = <0x00>;
		regmap = <0x04>;
		compatible = "syscon-reboot";
	};

	platform-bus@4000000 {
		interrupt-parent = <0x03>;
		ranges = <0x00 0x00 0x4000000 0x2000000>;
		#address-cells = <0x01>;
		#size-cells = <0x01>;
		compatible = "qemu,platform\0simple-bus";
	};

	memory@80000000 {
		device_type = "memory";
		reg = <0x00 0x80000000 0x00 0x8000000>;
	};

	cpus {
		#address-cells = <0x01>;
		#size-cells = <0x00>;
		timebase-frequency = <0x989680>;

		cpu@0 {
			phandle = <0x01>;
			device_type = "cpu";
			reg = <0x00>;
			status = "okay";
			compatible = "riscv";
			riscv,cboz-block-size = <0x40>;
			riscv,cbom-block-size = <0x40>;
			riscv,isa = "rv64imafdch_zicbom_zicboz_zicntr_zicsr_zifencei_zihintntl_zihintpause_zihpm_zawrs_zfa_zca_zcd_zba_zbb_zbc_zbs_sstc_svadu";
			mmu-type = "riscv,sv57";

			interrupt-controller {
				#interrupt-cells = <0x01>;
				interrupt-controller;
				compatible = "riscv,cpu-intc";
				phandle = <0x02>;
			};
		};

		cpu-map {

			cluster0 {

				core0 {
					cpu = <0x01>;
				};
			};
		};
	};

	pmu {
		riscv,event-to-mhpmcounters = <0x01 0x01 0x7fff9 0x02 0x02 0x7fffc 0x10019 0x10019 0x7fff8 0x1001b 0x1001b 0x7fff8 0x10021 0x10021 0x7fff8>;
		compatible = "riscv,pmu";
	};

	fw-cfg@10100000 {
		dma-coherent;
		reg = <0x00 0x10100000 0x00 0x18>;
		compatible = "qemu,fw-cfg-mmio";
	};

	flash@20000000 {
		bank-width = <0x04>;
		reg = <0x00 0x20000000 0x00 0x2000000 0x00 0x22000000 0x00 0x2000000>;
		compatible = "cfi-flash";
	};

	chosen {
		stdout-path = "/soc/serial@10000000";
		rng-seed = <0x43897bf0 0x80fa3886 0xc8cdb09b 0xeac1d3ca 0xae9aa588 0xfb20652f 0x78abd0e6 0xa9ec4aa8>;
	};

	soc {
		#address-cells = <0x02>;
		#size-cells = <0x02>;
		compatible = "simple-bus";
		ranges;

		rtc@101000 {
			interrupts = <0x0b>;
			interrupt-parent = <0x03>;
			reg = <0x00 0x101000 0x00 0x1000>;
			compatible = "google,goldfish-rtc";
		};

		serial@10000000 {
			interrupts = <0x0a>;
			interrupt-parent = <0x03>;
			clock-frequency = "\08@";
			reg = <0x00 0x10000000 0x00 0x100>;
			compatible = "ns16550a";
		};

		test@100000 {
			phandle = <0x04>;
			reg = <0x00 0x100000 0x00 0x1000>;
			compatible = "sifive,test1\0sifive,test0\0syscon";
		};

		pci@30000000 {
			interrupt-map-mask = <0x1800 0x00 0x00 0x07>;
			interrupt-map = <0x00 0x00 0x00 0x01 0x03 0x20 0x00 0x00 0x00 0x02 0x03 0x21 0x00 0x00 0x00 0x03 0x03 0x22 0x00 0x00 0x00 0x04 0x03 0x23 0x800 0x00 0x00 0x01 0x03 0x21 0x800 0x00 0x00 0x02 0x03 0x22 0x800 0x00 0x00 0x03 0x03 0x23 0x800 0x00 0x00 0x04 0x03 0x20 0x1000 0x00 0x00 0x01 0x03 0x22 0x1000 0x00 0x00 0x02 0x03 0x23 0x1000 0x00 0x00 0x03 0x03 0x20 0x1000 0x00 0x00 0x04 0x03 0x21 0x1800 0x00 0x00 0x01 0x03 0x23 0x1800 0x00 0x00 0x02 0x03 0x20 0x1800 0x00 0x00 0x03 0x03 0x21 0x1800 0x00 0x00 0x04 0x03 0x22>;
			ranges = <0x1000000 0x00 0x00 0x00 0x3000000 0x00 0x10000 0x2000000 0x00 0x40000000 0x00 0x40000000 0x00 0x40000000 0x3000000 0x04 0x00 0x04 0x00 0x04 0x00>;
			reg = <0x00 0x30000000 0x00 0x10000000>;
			dma-coherent;
			bus-range = <0x00 0xff>;
			linux,pci-domain = <0x00>;
			device_type = "pci";
			compatible = "pci-host-ecam-generic";
			#size-cells = <0x02>;
			#interrupt-cells = <0x01>;
			#address-cells = <0x03>;
		};

		virtio_mmio@10008000 {
			interrupts = <0x08>;
			interrupt-parent = <0x03>;
			reg = <0x00 0x10008000 0x00 0x1000>;
			compatible = "virtio,mmio";
		};

		virtio_mmio@10007000 {
			interrupts = <0x07>;
			interrupt-parent = <0x03>;
			reg = <0x00 0x10007000 0x00 0x1000>;
			compatible = "virtio,mmio";
		};

		virtio_mmio@10006000 {
			interrupts = <0x06>;
			interrupt-parent = <0x03>;
			reg = <0x00 0x10006000 0x00 0x1000>;
			compatible = "virtio,mmio";
		};

		virtio_mmio@10005000 {
			interrupts = <0x05>;
			interrupt-parent = <0x03>;
			reg = <0x00 0x10005000 0x00 0x1000>;
			compatible = "virtio,mmio";
		};

		virtio_mmio@10004000 {
			interrupts = <0x04>;
			interrupt-parent = <0x03>;
			reg = <0x00 0x10004000 0x00 0x1000>;
			compatible = "virtio,mmio";
		};

		virtio_mmio@10003000 {
			interrupts = <0x03>;
			interrupt-parent = <0x03>;
			reg = <0x00 0x10003000 0x00 0x1000>;
			compatible = "virtio,mmio";
		};

		virtio_mmio@10002000 {
			interrupts = <0x02>;
			interrupt-parent = <0x03>;
			reg = <0x00 0x10002000 0x00 0x1000>;
			compatible = "virtio,mmio";
		};

		virtio_mmio@10001000 {
			interrupts = <0x01>;
			interrupt-parent = <0x03>;
			reg = <0x00 0x10001000 0x00 0x1000>;
			compatible = "virtio,mmio";
		};

		plic@c000000 {
			phandle = <0x03>;
			riscv,ndev = <0x5f>;
			reg = <0x00 0xc000000 0x00 0x600000>;
			interrupts-extended = <0x02 0x0b 0x02 0x09>;
			interrupt-controller;
			compatible = "sifive,plic-1.0.0\0riscv,plic0";
			#address-cells = <0x00>;
			#interrupt-cells = <0x01>;
		};

		clint@2000000 {
			interrupts-extended = <0x02 0x03 0x02 0x07>;
			reg = <0x00 0x2000000 0x00 0x10000>;
			compatible = "sifive,clint0\0riscv,clint0";
		};
	};
};

```

> 注意此时的参数为 `-m 512M -smp 1` 

我们在上述设备树中可以看见许多或多或少要实现的 `IO` 设备，例如 `virtio_mmio@<address>`，`rtc@<address>` 等，这些都在 `soc` 这个节点下

> `SoC`，全称为 `System on Chip`，即系统芯片
> SoC 是一种将多个电子组件集成在一个芯片上的集成电路设计。它包含了一个或多个处理器核心、内存、外设接口等电子元件,可以完成计算机的核心功能。
> 在设备树中,SoC 节点通常描述了整个系统芯片的信息,包括:
> 1. CPU 核心信
> 2. 内存控制器
> 3. 外设接口,如串口、I2C、SPI 等
> 4. 中断控制器
> 5. 时钟管理
> 6. 电源管理
> 7. 其他芯片集成的功能模块

我们在下面来实现最常见的中断：时钟中断
# RTC

> RTC 设备(Real-Time Clock)是一种专用的时钟设备,主要用于在计算机或嵌入式系统中提供实时时间和日期信息。它具有以下主要特点:
> 1. 提供实时时钟功能:RTC 设备能够持续保持时间和日期信息,即使在系统断电或休眠时也能保持正确的时间。
> 2. 独立电源支持:RTC 设备通常有一个独立的备用电池,即使在主电源断开的情况下也能继续工作,保持时间不丢失。
> 3. 功耗低:RTC 设备的功耗一般很低,适合嵌入式系统使用。
> 4. 接口标准化:RTC 设备通常采用I2C、SPI或其他标准接口,方便与主处理器进行通信和时间数据交换。

为了后面的进程切换等功能，我们首先实现一个简单的时钟中断

我们可以在的最后一张图中看见设备树，其中注意 `rtc` 这一栏，使用 `make run | rg rtc` 可以看见：

`[INFO] rtc@101000 has compatible: "google,goldfish-rtc"`

> 注意这里的 `compatible` 的意思是兼容性，在 `qemu` 中这里模拟的 `rtc` 的型号是 `google` 的 `goldfish-rtc`

我们可以在这里找到对应的文档：
1. [Goldfish-RTC 文档](https://android.googlesource.com/platform/external/qemu/+/master/docs/GOLDFISH-VIRTUAL-HARDWARE.TXT)
2. [Add Goldfish RTC device](https://patchwork.kernel.org/project/qemu-devel/patch/20190924084201.107958-2-anup.patel@wdc.com/)
3. [Linux RTC Driver](https://github.com/torvalds/linux/blob/master/drivers/rtc/rtc-goldfish.c)
4. [FreeBSD RTC Driver](https://reviews.freebsd.org/rS363571)

> 我们在这里的实现大多是模仿 `Linux` 中的实现（除了 `Timestramp` 的定义不是之外）

对于 `Goldfish`，显然我们只需要知道两个信息就足够了：
1. `base_address`
2. `irq`

而 `base_address` 可以从设备树的名字中获得，也可以从 `reg` 这个 `property` 中获得：
reg = <0x00 0x101000 0x00 0x1000>
- 0x00 是占位符  
- 0x101000是基地址  
- 0x00 是占位符  
- 0x1000是RTC寄存器大小，表示设备内存为4 KB

获取的方式是通过迭代器，而由于 `rtc` 只存在一个 `start_address`，因此我们直接用 `fold` 然后求和也无伤大雅，只需要在 `debug` 时增加一个断言，保证最后得到的地址一定能与名称上的地址对得上既可。

我们保证 `GoldfishRTC` 一定要实现 `RTC` 的基础功能（虽然现在只有获取时间的功能）：

```rust
pub struct TimeSpec {
    pub sec: u64,
    pub nsec: u64,
}

impl Debug for TimeSpec {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.write_fmt(format_args!("{}s.{}ns", self.sec, self.nsec))
    }
}

impl TimeSpec {
    pub const fn new(sec: u64, nsec: u64) -> Self {
        Self { sec, nsec }
    }
}

#[inline]
fn do_div(time: u64, ticks: u64) -> (u64, u64) {
    (time / ticks, time % ticks)
}

impl RTCDriver for GoldfishRTC {
    /// Get the current time into timespce: see more in FreeBSD's `goldfish-rtc` implementation
    fn get_time(&self) -> TimeSpec {
        unsafe {
            let time_low = read_volatile((self.base + TIMER_TIME_LOW as usize) as *const u32);
            let time_high = read_volatile((self.base + TIMER_TIME_HIGH as usize) as *const u32);
            let time: u64 = ((time_high as u64) << 32) | (time_low as u64);

            let (sec, nsec) = do_div(time, NSEC_PER_SEC);

            TimeSpec::new(sec, nsec)
        }
    }
}
```

> TODO
> 
