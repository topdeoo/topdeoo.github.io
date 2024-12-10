---
title: gprof 的一些使用指北
description: 
tags:
  - Linux
  - Issue
date: 2024-07-09
lastmod: 2024-12-10
draft: false
---

事情的起因是我在对 `SAT Solver` 进行优化测试时，发现了我的求解器测不准时间，具体表现为，我在代码中测试的时间与 `gprof` 得到的时间不相符，后者的时间要比前者少将近 $20\%$，实在是让人匪夷所思。

# 背景知识

一个简单的 `SAT Solver`，我们以 `DPLL` 算法为例，其框架如下所示：

```cpp
while(1){
	auto conf = bcp();
	if(conf){
		auto level = backtrack();
		if(level < 0){
			return UNSAT;
		}
		flip();
	} else {
		auto result = decide();
		if(result){
			return SAT;
		}
	}
}
```

我们假设这个过程为函数 `solve`，于是，我们测时间的代码如下：

```cpp
double process_time(void) {
  struct rusage u;
  double res;
  if (getrusage(RUSAGE_SELF, &u)) return 0;
  res = u.ru_utime.tv_sec + 1e-6 * u.ru_utime.tv_usec;
  res += u.ru_stime.tv_sec + 1e-6 * u.ru_stime.tv_usec;
  return res;
}

//! main function
auto _start = process_time();
solve();
auto dur = process_time() - _start;
```

于是，`dur` 就是求解的时间

## `gprof` 简介

[Gprof](https://sourceware.org/binutils/docs/gprof/) 是 GNU binutils 工具之一。可以分析出代码中每个函数的调用次数、每个函数消耗的处理器时间等，我们通过在编译选项中加上 `-pg` 即可开启。

例如：

```bash
g++ main.cc -pg -O2 -Wall -Werro -o main
```

随后，运行 `./main` 后，会产生一个名为 `gmon.out` 的文件，我们通过如下命令来解析：

```bash
gprof -b main gmon.out > profiling.log
```

即可查看 `profiling` 的结果。

其工作原理十分简单，主要是利用了插桩，他首先会激活一个名为 `mcount` 的函数，随后，他会在运行每段函数之前都去调用这个 `mcount` 来记录此函数的调用次数以及时间，例如，我们在 `propagate` 函数中：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202407230036720.png)

粗略了解了这些，我们来进行问题的介绍。

## 测试结果

然而，我们得到的结果如下所示：

```bash
[bcp] 21.754837395 s [decide] 0.233632646 s [backtrack] 3.439200214 s
[time] 56.299 s
```

然而，`gprof` 的结果如下所示：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202407230025983.png)

可以发现一个

# 原因分析

查询了诸多资料，发现有之前有人提出过类似的 [问题](https://bbs.archlinux.org/viewtopic.php?id=98391)，但时间却已经是 2010 年了，其解决方法都是换一个 `profiling` 工具，并没有给出这个问题的原因。

> 由于我们代码的运行时间几乎 $90\%$ 都在运行 `propagate` 函数，因此下面我们只考虑这一部分（测不准的也在这部分）

这里，我给出一个猜测的原因，由于我们的 `propagate` 代码的写法如下：

```cpp
for(auto &lit : trail){
	if((conf = propagate_binary(lit))){
		return conf;
	} else if((conf = propagate_cnf(lit))){
		return conf;
	}
}
```

然而，其结果如下所示：

![](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202407230046335.png)

我们统计了 `propagate` 被调用的次数：

```bash
[key] 9130372acd411 [time] 799.341 s
[bcp count] 331 862 591 [bcp max time] 0.001 [bcp total time] 692.34
```

于是，我们有一个合理的怀疑：

> 由于函数调用会有上下文切换的额外开销，在如此之大的函数调用数下，是否大多数的时间都在运行调用栈的开辟与恢复？而由于 `gprof` 的插桩也只能让我们测试出每个函数的运行时间，反而在切换时的时间会忽略，这是否也是造成 `gprof` 无法测准时间的一大重要原因？

接着，我们直接手动内联（指人力内联）传播的两个函数，合并为一整个 `propagate` 函数后，我们发现 `gprof` 能够测准时间了，并且时间与程序内时间函数测试的一致（并没有减少），但相较于频繁的函数调用，时间还是减少了不少。

# 结论

在函数调用次数过多，大于 $10^8$，我们推荐不要再使用函数，直接手动内联，否则在函数调用的开销会十分巨大，导致程序速度变慢，且 `gprof` 无法测准函数运行时间。