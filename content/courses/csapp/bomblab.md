---
title: bomb-lab
description: 很有意思的实验，至少在我做过的里面这个带来的正反馈是最多的
tags: [CMU]
date: 2022-03-29
lastmod: 2024-12-10
draft: false
---

> 前置条件：阅读完 3.10.3 前的内容

# 实验准备

在官网下载 `handout` 文件，解压到本地，阅读 `Writeup` 文档，有详细解释实验的做法（一开始完全没注意到还要看这个东西，导致解压完不知道要做啥）

解压后，运行命令：

```shell
objdump -d bomb > bomb.s
```

反汇编出 `bomb.s`。

建议在 `VS Code` 中阅读代码，可以安装插件 `GNU Assembler Language Support`(牛头人插件)让汇编高亮，方便阅读。

查找地址的时候还可以用 `ctrl + f` 来进行快速查找。

# 实验过程

实验分为六个阶段和一个彩蛋阶段（需要自己先把汇编简单浏览一遍才能发现）。

## Phase_0

阅读 `bomb.c` 文件，可以发现每个 `phase` 都是一个模板：

```c
    /* Hmm...  Six phases must be more secure than one phase! */
    input = read_line();             /* Get input                   */
    phase_1(input);                  /* Run the phase               */
    phase_defused();                 /* Drat!  They figured it out!
				      * Let me know how they did it. */
```

也就是需要输入一行字符串（之类的），然后系统会判断输入的字符串是否合法，若合法则炸弹被排除，否则爆炸。

（如果是 CMU 学生的话，每次炸弹爆炸都会把信息反馈到服务器....）

大概知道是怎么回事了就可以开始进行真正的实验了，如果还不知道，建议仔细阅读 `Writeup` 文档（虽然是全英的）

运行反汇编命令之后可以直接找到 `main` 函数，这与 `bomb.c` 中的结构是一样的，我们可以参照源代码来看这部分的汇编。

前面带有 `plt` 部分的汇编都代表了系统函数（库函数），功能和作用都可以在网上查到。

## Phase_1

很轻易就能找到 `phase_1` 部分的汇编。

```asm
0000000000400ee0 <phase_1>:
  400ee0:	48 83 ec 08          	sub    $0x8,%rsp
  400ee4:	be 00 24 40 00       	mov    $0x402400,%esi
  400ee9:	e8 4a 04 00 00       	callq  401338 <strings_not_equal>
  400eee:	85 c0                	test   %eax,%eax
  400ef0:	74 05                	je     400ef7 <phase_1+0x17>
  400ef2:	e8 43 05 00 00       	callq  40143a <explode_bomb>
  400ef7:	48 83 c4 08          	add    $0x8,%rsp
  400efb:	c3                   	retq
```

可以发现在 `400ee9` 处调用了 `strings_not_equal` 这个函数，并在下一行中查看 `%rax` （返回值）是否为 $0$，是则结束阶段，否则引爆炸弹。

于是我们跳转到 `401338` 处查看 `strings_not_equal` 的代码。

```asm
0000000000401338 <strings_not_equal>:
  401338:	41 54                	push   %r12
  40133a:	55                   	push   %rbp
  40133b:	53                   	push   %rbx
  40133c:	48 89 fb             	mov    %rdi,%rbx
  40133f:	48 89 f5             	mov    %rsi,%rbp
  401342:	e8 d4 ff ff ff       	callq  40131b <string_length>
  401347:	41 89 c4             	mov    %eax,%r12d
  40134a:	48 89 ef             	mov    %rbp,%rdi
  40134d:	e8 c9 ff ff ff       	callq  40131b <string_length>
  401352:	ba 01 00 00 00       	mov    $0x1,%edx
  401357:	41 39 c4             	cmp    %eax,%r12d
  40135a:	75 3f                	jne    40139b <strings_not_equal+0x63>
  40135c:	0f b6 03             	movzbl (%rbx),%eax
  40135f:	84 c0                	test   %al,%al
  401361:	74 25                	je     401388 <strings_not_equal+0x50>
  401363:	3a 45 00             	cmp    0x0(%rbp),%al
  401366:	74 0a                	je     401372 <strings_not_equal+0x3a>
  401368:	eb 25                	jmp    40138f <strings_not_equal+0x57>
  40136a:	3a 45 00             	cmp    0x0(%rbp),%al
  40136d:	0f 1f 00             	nopl   (%rax)
  401370:	75 24                	jne    401396 <strings_not_equal+0x5e>
  401372:	48 83 c3 01          	add    $0x1,%rbx
  401376:	48 83 c5 01          	add    $0x1,%rbp
  40137a:	0f b6 03             	movzbl (%rbx),%eax
  40137d:	84 c0                	test   %al,%al
  40137f:	75 e9                	jne    40136a <strings_not_equal+0x32>
  401381:	ba 00 00 00 00       	mov    $0x0,%edx
  401386:	eb 13                	jmp    40139b <strings_not_equal+0x63>
  401388:	ba 00 00 00 00       	mov    $0x0,%edx
  40138d:	eb 0c                	jmp    40139b <strings_not_equal+0x63>
  40138f:	ba 01 00 00 00       	mov    $0x1,%edx
  401394:	eb 05                	jmp    40139b <strings_not_equal+0x63>
  401396:	ba 01 00 00 00       	mov    $0x1,%edx
  40139b:	89 d0                	mov    %edx,%eax
  40139d:	5b                   	pop    %rbx
  40139e:	5d                   	pop    %rbp
  40139f:	41 5c                	pop    %r12
  4013a1:	c3                   	retq
```

在 `40133f` 处可以发现这个函数接受两个参数，分别存在 `%rdi` 与 `%rsi` 中，通过函数名也能猜出来，这个函数应该是判断两个字符串是否相等的。

于是根据我们一惯的判断方法：先看长度是否相等，再看每个字符是否相同。

事实上，我们只需要知道相等的返回值是多少即可（也可以直接猜出来）。

显然，长度不相等，从 `401352` + `40139b` 可以看出来，应当返回 $1$ ,那么由 `401381`/`401388` 即可看出，若相等应该返回 $0$。

但存储在 `%rdi` 与 `%rsi` 中的字符串到底是什么？

下面通过 `gdb` 去查看。

输入命令

```bash
$ gdb bomb

(gdb) b string_not_equals
(gdb) r
```

随后随便输入一个字符串（假设输入了 `11111`），程序便会在 `strings_not_equal` 处停下。

可以通过命令 `stepi 1` 来逐步运行语句，通过`x/ls 0xffffffff` 来查看在地址 `0xffffffff` 处的字符串，`info r` 查看寄存器信息（具体`gdb`的命令可以上网查）

那么，我们就需要去检查 `%rdi` 与 `%rsi` 中储存的字符串到底是什么，如下图所示：

![Check](https://s2.loli.net/2022/04/10/vIYtOhakCJDjpqe.png)

于是，我们就能看出来，我们需要输入的字符串就是在 `%rsi` 中的字符串（应该是起始地址存在 `%rsi` 中）。

于是输入 `Border relations with Canada have never been better.` ，阶段一就结束了。

![Success](https://s2.loli.net/2022/04/10/SsLWdfq15DtB2vb.png)

## Phase_2

先贴代码：

```asm
  400efc:	55                   	push   %rbp
  400efd:	53                   	push   %rbx
  400efe:	48 83 ec 28          	sub    $0x28,%rsp
  400f02:	48 89 e6             	mov    %rsp,%rsi
  400f05:	e8 52 05 00 00       	callq  40145c <read_six_numbers>
  400f0a:	83 3c 24 01          	cmpl   $0x1,(%rsp)
  400f0e:	74 20                	je     400f30 <phase_2+0x34>
  400f10:	e8 25 05 00 00       	callq  40143a <explode_bomb>
  400f15:	eb 19                	jmp    400f30 <phase_2+0x34>
  400f17:	8b 43 fc             	mov    -0x4(%rbx),%eax
  400f1a:	01 c0                	add    %eax,%eax
  400f1c:	39 03                	cmp    %eax,(%rbx)
  400f1e:	74 05                	je     400f25 <phase_2+0x29>
  400f20:	e8 15 05 00 00       	callq  40143a <explode_bomb>
  400f25:	48 83 c3 04          	add    $0x4,%rbx
  400f29:	48 39 eb             	cmp    %rbp,%rbx
  400f2c:	75 e9                	jne    400f17 <phase_2+0x1b>
  400f2e:	eb 0c                	jmp    400f3c <phase_2+0x40>
  400f30:	48 8d 5c 24 04       	lea    0x4(%rsp),%rbx
  400f35:	48 8d 6c 24 18       	lea    0x18(%rsp),%rbp
  400f3a:	eb db                	jmp    400f17 <phase_2+0x1b>
  400f3c:	48 83 c4 28          	add    $0x28,%rsp
  400f40:	5b                   	pop    %rbx
  400f41:	5d                   	pop    %rbp
  400f42:	c3                   	retq

```

`400f05` 显然是最显眼的，函数名也很暴力，直接告诉我们需要输入六个数字，并且在上一行中，还将 `%rsp` 的值存到了 `%rsi` （第二个参数）中，也就是说这六个数都存到了栈之中。

阅读 `read_six_numbers` 的汇编：

```asm
  40145c:	48 83 ec 18          	sub    $0x18,%rsp
  401460:	48 89 f2             	mov    %rsi,%rdx
  401463:	48 8d 4e 04          	lea    0x4(%rsi),%rcx
  401467:	48 8d 46 14          	lea    0x14(%rsi),%rax
  40146b:	48 89 44 24 08       	mov    %rax,0x8(%rsp)
  401470:	48 8d 46 10          	lea    0x10(%rsi),%rax
  401474:	48 89 04 24          	mov    %rax,(%rsp)
  401478:	4c 8d 4e 0c          	lea    0xc(%rsi),%r9
  40147c:	4c 8d 46 08          	lea    0x8(%rsi),%r8
  401480:	be c3 25 40 00       	mov    $0x4025c3,%esi
  401485:	b8 00 00 00 00       	mov    $0x0,%eax
  40148a:	e8 61 f7 ff ff       	callq  400bf0 <__isoc99_sscanf@plt>
  40148f:	83 f8 05             	cmp    $0x5,%eax
  401492:	7f 05                	jg     401499 <read_six_numbers+0x3d>
  401494:	e8 a1 ff ff ff       	callq  40143a <explode_bomb>
  401499:	48 83 c4 18          	add    $0x18,%rsp
  40149d:	c3                   	retq
```

发现调用了一个陌生的函数 `sscanf` ，查阅文档后可知，其功能为将输入的字符串通过格式流进行转换，也就是可以将 `1 1 1 1 1` 转化为五个数字 `1`，返回值为转化的字符的个数，如这里就是 $5$。

仔细阅读后，逆向工程即为：

```c
void read_six_numbers(char *input, int* a){
    if(sscanf(input, "%d %d %d %d %d %d", &a[0], &a[1], &a[2], &a[3], &a[4], &a[5]) <= 5)
        explode_bomb();
}
```

可以看出，这里的数组 `a` ，就是在 `400f02 `中的 `%rsp` 中储存的地址，那么，读出来的数便存储在 `%rsp, %rsp + 4, %rsp + 8, %rsp + 12, %rsp + 16, %rsp + 20`。

接下来，回到 `phase_2`，发现 `400f0a` 与下一行共同要求了，输入的第一个数 `(%rsp)` 一定为 $1$ ，否则引爆炸弹。

若相等，代码令 `%rbx = &(%rsp + 4)` ，也就是令 `%rbx = &a[i + 1]`，若 `%rsp = &a[i]`；令 `%rbp = &(%rsp + 24) = &a[6]`，比最后一个数多 4 字节。然后跳转到 `400f17`，开始循环：

```asm
  400f17:	8b 43 fc             	mov    -0x4(%rbx),%eax
# (%rbx-4)表示前一个数
  400f1a:	01 c0                	add    %eax,%eax
# 2 * %eax
  400f1c:	39 03                	cmp    %eax,(%rbx)
  400f1e:	74 05                	je     400f25 <phase_2+0x29>
# 相等就不爆炸
  400f20:	e8 15 05 00 00       	callq  40143a <explode_bomb>
  400f25:	48 83 c3 04          	add    $0x4,%rbx
# %rbx 移到下一个位置
  400f29:	48 39 eb             	cmp    %rbp,%rbx
# 判断是否到达最后一个数
  400f2c:	75 e9                	jne    400f17 <phase_2+0x1b>
  400f2e:	eb 0c                	jmp    400f3c <phase_2+0x40>
# 到达则结束循环
```

在前三行已经描述了输入的序列应满足的要求：$a[i+1] = 2a[i]$。

由于第一个数一定为 $1$ ，于是这个序列为：$1\,2\,4\,8\,16\,32$。

![Success](https://s2.loli.net/2022/04/10/JYUzIgTuLdxa5ck.png)

阶段二结束。

## Phase_3

```asm
0000000000400f43 <phase_3>:
  400f43:	48 83 ec 18          	sub    $0x18,%rsp
# 分配24个栈帧
  400f47:	48 8d 4c 24 0c       	lea    0xc(%rsp),%rcx
# %rcx = *(%rsp + 12)
  400f4c:	48 8d 54 24 08       	lea    0x8(%rsp),%rdx
# %rdx = *(%rsp + 8)
  400f51:	be cf 25 40 00       	mov    $0x4025cf,%esi
  400f56:	b8 00 00 00 00       	mov    $0x0,%eax
  400f5b:	e8 90 fc ff ff       	callq  400bf0 <__isoc99_sscanf@plt>
  400f60:	83 f8 01             	cmp    $0x1,%eax
  400f63:	7f 05                	jg     400f6a <phase_3+0x27>
# 输入两个数
  400f65:	e8 d0 04 00 00       	callq  40143a <explode_bomb>
  400f6a:	83 7c 24 08 07       	cmpl   $0x7,0x8(%rsp)
# 判断输入的第一个数与7的大小
  400f6f:	77 3c                	ja     400fad <phase_3+0x6a>
# 第一个数要小于等于7
  400f71:	8b 44 24 08          	mov    0x8(%rsp),%eax
# %eax = %rdx
  400f75:	ff 24 c5 70 24 40 00 	jmpq   *0x402470(,%rax,8)
```

在汇编代码中给出注释。

**要注意的是，我们可以从`sscanf`的格式流知道应该输入多少个数字，这个格式流在 `0x4025cf`中有，可以使用 `x/ls 0x4025cf` 来查看**

在最后一行 `400f75` 注意到这个 `jmpq` 的结构，对比书中的 `switch` 跳转表结构，可以发现是一致的，只不过这里没用标签。

于是很显然，这里需要输入的两个数就是 `switch` 中的索引与索引对应的值。

那么，检查下面的代码：

```asm
  400f7c:	b8 cf 00 00 00       	mov    $0xcf,%eax
  400f81:	eb 3b                	jmp    400fbe <phase_3+0x7b>

  400f83:	b8 c3 02 00 00       	mov    $0x2c3,%eax
  400f88:	eb 34                	jmp    400fbe <phase_3+0x7b>

  400f8a:	b8 00 01 00 00       	mov    $0x100,%eax
  400f8f:	eb 2d                	jmp    400fbe <phase_3+0x7b>

  400f91:	b8 85 01 00 00       	mov    $0x185,%eax
  400f96:	eb 26                	jmp    400fbe <phase_3+0x7b>

  400f98:	b8 ce 00 00 00       	mov    $0xce,%eax
  400f9d:	eb 1f                	jmp    400fbe <phase_3+0x7b>

  400f9f:	b8 aa 02 00 00       	mov    $0x2aa,%eax
  400fa4:	eb 18                	jmp    400fbe <phase_3+0x7b>

  400fa6:	b8 47 01 00 00       	mov    $0x147,%eax
  400fab:	eb 11                	jmp    400fbe <phase_3+0x7b>
  400fad:	e8 88 04 00 00       	callq  40143a <explode_bomb>

  400fb2:	b8 00 00 00 00       	mov    $0x0,%eax
  400fb7:	eb 05                	jmp    400fbe <phase_3+0x7b>

  400fb9:	b8 37 01 00 00       	mov    $0x137,%eax
  400fbe:	3b 44 24 0c          	cmp    0xc(%rsp),%eax
  400fc2:	74 05                	je     400fc9 <phase_3+0x86>
```

并结合前面，输入的第一个数小于等于$7$，我们可以确定其索引为 $0 \to 7$，通过上述的语句，便可以确定每个索引所对应的值（都储存在了 `%rax` 中）。

于是我们可以得到答案为（这里没有去算索引为 $0$ 时对应的值）：

`1 311`，`2 707`， `3 256`， `4 389`， `5 206`， `6 682`， `7 327`

![Success](https://s2.loli.net/2022/04/10/mn8AoEcwGa39X2x.png)

阶段三结束。

## Phase_4

或许是最简单的一个阶段？

```asm
000000000040100c <phase_4>:
  40100c:	48 83 ec 18          	sub    $0x18,%rsp
  401010:	48 8d 4c 24 0c       	lea    0xc(%rsp),%rcx
  401015:	48 8d 54 24 08       	lea    0x8(%rsp),%rdx
  40101a:	be cf 25 40 00       	mov    $0x4025cf,%esi
  40101f:	b8 00 00 00 00       	mov    $0x0,%eax
  401024:	e8 c7 fb ff ff       	callq  400bf0 <__isoc99_sscanf@plt>
  401029:	83 f8 02             	cmp    $0x2,%eax
  40102c:	75 07                	jne    401035 <phase_4+0x29>
# 输入两个数，不是的话直接炸
  40102e:	83 7c 24 08 0e       	cmpl   $0xe,0x8(%rsp)
  401033:	76 05                	jbe    40103a <phase_4+0x2e>
# 第一个数要小于等于14
  401035:	e8 00 04 00 00       	callq  40143a <explode_bomb>

  40103a:	ba 0e 00 00 00       	mov    $0xe,%edx
  40103f:	be 00 00 00 00       	mov    $0x0,%esi
  401044:	8b 7c 24 08          	mov    0x8(%rsp),%edi
# 接受三个参数，第一个参数是输入的第一个数，第二个是0，第三个是14
  401048:	e8 81 ff ff ff       	callq  400fce <func4>

  40104d:	85 c0                	test   %eax,%eax
  40104f:	75 07                	jne    401058 <phase_4+0x4c>
# 返回值需要为 0
  401051:	83 7c 24 0c 00       	cmpl   $0x0,0xc(%rsp)
# 第二个输入为 0
  401056:	74 05                	je     40105d <phase_4+0x51>
  401058:	e8 dd 03 00 00       	callq  40143a <explode_bomb>
  40105d:	48 83 c4 18          	add    $0x18,%rsp
  401061:	c3                   	retq
```

显然事情都在 `fun4` 中做了，`phase_4` 只是调用了一下函数，检查一下返回值而已。

转到`fun4`去：

```asm
0000000000400fce <func4>:
# 接受三个参数，第一个参数是输入的第一个数，第二个是0，第三个是14
# x in %rdi, y in %rsi, z in %rdx
  400fce:	48 83 ec 08          	sub    $0x8,%rsp
  400fd2:	89 d0                	mov    %edx,%eax
# val = z
  400fd4:	29 f0                	sub    %esi,%eax
# val = val - x
  400fd6:	89 c1                	mov    %eax,%ecx
# t = val
  400fd8:	c1 e9 1f             	shr    $0x1f,%ecx
# t >>= 31
  400fdb:	01 c8                	add    %ecx,%eax
# val += t
  400fdd:	d1 f8                	sar    %eax
  400fdf:	8d 0c 30             	lea    (%rax,%rsi,1),%ecx
# t = val + y
  400fe2:	39 f9                	cmp    %edi,%ecx
  400fe4:	7e 0c                	jle    400ff2 <func4+0x24>
# t > x
  400fe6:	8d 51 ff             	lea    -0x1(%rcx),%edx
# z = z - t
  400fe9:	e8 e0 ff ff ff       	callq  400fce <func4>
  400fee:	01 c0                	add    %eax,%eax
# val = 2fun4(x, y, z)
  400ff0:	eb 15                	jmp    401007 <func4+0x39>

# t <= x
  400ff2:	b8 00 00 00 00       	mov    $0x0,%eax
# val = 0
  400ff7:	39 f9                	cmp    %edi,%ecx
  400ff9:	7d 0c                	jge    401007 <func4+0x39>
# t < x
  400ffb:	8d 71 01             	lea    0x1(%rcx),%esi
# y = *(t + 1)
  400ffe:	e8 cb ff ff ff       	callq  400fce <func4>
  401003:	8d 44 00 01          	lea    0x1(%rax,%rax,1),%eax
# val = fun4(x, y, z) + 1

# t >= x
  401007:	48 83 c4 08          	add    $0x8,%rsp
  40100b:	c3                   	retq
```

于是，直接做逆向工程：

```c
int fun4(int x, int y ,int z){
    int val = z;
    val = val - x;
    int t = val>>31;
    val += t;
    t = val + y;
    if(t > x){
        z = z - t;
        val = 2 * fun4(x, y, z);
    }
    else {
        val = 0;
        if(t < x)
            y = t + 1;
        val = fun4(x, y, z) + 1;
    }
    return val;
}

void phase_4(char* input){
    int a, b;
    if(sscanf(input, "%d %d", &a, &b) <= 1)
        explode_bomb();
    if(!fun4(a, 0, 14) && !b)
        return;
    else
        explode_bomb();
}
```

反正 $0\le a\le 14$，直接枚举就可以，很简单。

答案应该不止一个，我第一次试 `7 0`直接就对了，所以没试其他的。

![Success](https://s2.loli.net/2022/04/10/l7EpXzg6UFLaDAs.png)

阶段四结束。

## Phase_5

```asm
0000000000401062 <phase_5>:
# input在 %rdi里
  401062:	53                   	push   %rbx
  401063:	48 83 ec 20          	sub    $0x20,%rsp
  401067:	48 89 fb             	mov    %rdi,%rbx
# 复制输入到 %rbx
  40106a:	64 48 8b 04 25 28 00 	mov    %fs:0x28,%rax
# 复制输入的字符串到 %rax
  401071:	00 00
  401073:	48 89 44 24 18       	mov    %rax,0x18(%rsp)
# 输入的字符串现在在 (%rsp + 24)中
  401078:	31 c0                	xor    %eax,%eax
# 将 %rax 置 0
  40107a:	e8 9c 02 00 00       	callq  40131b <string_length>
  40107f:	83 f8 06             	cmp    $0x6,%eax
  401082:	74 4e                	je     4010d2 <phase_5+0x70>
# 输入字符串的长度要等于 6
  401084:	e8 b1 03 00 00       	callq  40143a <explode_bomb>
  401089:	eb 47                	jmp    4010d2 <phase_5+0x70>

  40108b:	0f b6 0c 03          	movzbl (%rbx,%rax,1),%ecx
# 把输入的字符串每个字符取出来(ascii码)
  40108f:	88 0c 24             	mov    %cl,(%rsp)

  401092:	48 8b 14 24          	mov    (%rsp),%rdx
  401096:	83 e2 0f             	and    $0xf,%edx
# 只要低四位的数，存到 %edx中
  401099:	0f b6 92 b0 24 40 00 	movzbl 0x4024b0(%rdx),%edx
# maduiersnfotvbyl（从0x4024b0开始 + 低四位的数）的字符
  4010a0:	88 54 04 10          	mov    %dl,0x10(%rsp,%rax,1)
# 把上述加到的字符取出来放到（%rsp + i + 16）中
  4010a4:	48 83 c0 01          	add    $0x1,%rax
  4010a8:	48 83 f8 06          	cmp    $0x6,%rax
  4010ac:	75 dd                	jne    40108b <phase_5+0x29>
# 循环6次
  4010ae:	c6 44 24 16 00       	movb   $0x0,0x16(%rsp)
#最后从maduiersnfotvbyl取出来的字符要等于flyers
  4010b3:	be 5e 24 40 00       	mov    $0x40245e,%esi
# 这个位置的字符串是 flyers
  4010b8:	48 8d 7c 24 10       	lea    0x10(%rsp),%rdi
  4010bd:	e8 76 02 00 00       	callq  401338 <strings_not_equal>
  4010c2:	85 c0                	test   %eax,%eax
  4010c4:	74 13                	je     4010d9 <phase_5+0x77>
  4010c6:	e8 6f 03 00 00       	callq  40143a <explode_bomb>
  4010cb:	0f 1f 44 00 00       	nopl   0x0(%rax,%rax,1)
  4010d0:	eb 07                	jmp    4010d9 <phase_5+0x77>
  4010d2:	b8 00 00 00 00       	mov    $0x0,%eax
# 将 %rax 置 0
  4010d7:	eb b2                	jmp    40108b <phase_5+0x29>
  4010d9:	48 8b 44 24 18       	mov    0x18(%rsp),%rax
  4010de:	64 48 33 04 25 28 00 	xor    %fs:0x28,%rax
  4010e5:	00 00
  4010e7:	74 05                	je     4010ee <phase_5+0x8c>
  4010e9:	e8 42 fa ff ff       	callq  400b30 <__stack_chk_fail@plt>
  4010ee:	48 83 c4 20          	add    $0x20,%rsp
  4010f2:	5b                   	pop    %rbx
  4010f3:	c3                   	retq
```

这里只提一下为什么会提到 `maduiersnfotvbyl` 这个字符串。

运行到 `401089` 为止，都只是在判断输入的字符串是否合法，并没有真正进入到这个阶段的关键部分，到这一步后，我们会跳转到 `40108b` ，随后会运行到 `401099`，我们会注意到这里有一个奇怪的地址 `0x4024b0`，这条语句将 `%edx` 设置为 `(%rdx + 0x4024b0)`，而在前面我们已经知道 `%rdx` 是输入字符的 `ASCII` 码的低四位，可以理解为一个偏移量，于是我们去检查 `0x4024b0` 到底有什么：

![Check](https://s2.loli.net/2022/04/10/uCb2jfNQZmqxASG.png)

于是，我们就可以找到这个神奇的字符串了。

剩下的我们只需要通过输入的字符串每个字符的低四位作为偏移量，在这个字符串中选择出与 `4010bd` 中函数所需的另一个字符串相等的字符串即可。

于是，可以检查 `%rsi` 或者前面`4010b3`中提到的`0x40245e`中存储的字符串：

![Check](https://s2.loli.net/2022/04/10/dHWEoszJyh2At4g.png)

那么，我们只需要从`maduiersnfotvbyl`选择出 `flyers` 即可。

在 `ASCII` 表中寻找末尾为 `0x9` `0xf` `0xe` `0x5` `0x6` `0x7`即可，可以选择`ionefg`。

![Success](https://s2.loli.net/2022/04/10/KEYPvpRda8cOCD9.png)

阶段五结束。

## Phase_6

最后一个阶段（是也不是），还是有点难度的，主要是汇编太长了，让人完全不想看。

```asm
00000000004010f4 <phase_6>:
  4010f4:	41 56                	push   %r14
  4010f6:	41 55                	push   %r13
  4010f8:	41 54                	push   %r12
  4010fa:	55                   	push   %rbp
  4010fb:	53                   	push   %rbx
  4010fc:	48 83 ec 50          	sub    $0x50,%rsp
  401100:	49 89 e5             	mov    %rsp,%r13
# %r13 = %rsp
  401103:	48 89 e6             	mov    %rsp,%rsi
# %rsi = %rsp
  401106:	e8 51 03 00 00       	callq  40145c <read_six_numbers>
# save in (%rsp), (%rsp + 4), (%rsp + 8), (%rsp + 12), (%rsp + 16), (%rsp + 20)
  40110b:	49 89 e6             	mov    %rsp,%r14
# %r14 = %rsp
  40110e:	41 bc 00 00 00 00    	mov    $0x0,%r12d
# %r12d = 0
  401114:	4c 89 ed             	mov    %r13,%rbp
# %rbp = %r13 = %rsp
  401117:	41 8b 45 00          	mov    0x0(%r13),%eax
# %eax为第一个输入的数
  40111b:	83 e8 01             	sub    $0x1,%eax
# 减一
  40111e:	83 f8 05             	cmp    $0x5,%eax
  401121:	76 05                	jbe    401128 <phase_6+0x34> # 无符号数
# 输入的第一个数要小于等于 6
  401123:	e8 12 03 00 00       	callq  40143a <explode_bomb>

  401128:	41 83 c4 01          	add    $0x1,%r12d
# 从 1 开始到 6
  40112c:	41 83 fc 06          	cmp    $0x6,%r12d
  401130:	74 21                	je     401153 <phase_6+0x5f>
  401132:	44 89 e3             	mov    %r12d,%ebx
# ebx为循环变量 i
  401135:	48 63 c3             	movslq %ebx,%rax
# 符号拓展（其实就是0拓展，因为循环变量i为正数）
  401138:	8b 04 84             	mov    (%rsp,%rax,4),%eax
# %eax = *(%rsp + 4 * %rax)
  40113b:	39 45 00             	cmp    %eax,0x0(%rbp)
# 比较输入的第一个数与%eax的大小
  40113e:	75 05                	jne    401145 <phase_6+0x51>
# 不相等就跳转
  401140:	e8 f5 02 00 00       	callq  40143a <explode_bomb>
  401145:	83 c3 01             	add    $0x1,%ebx
# %ebx += 1
  401148:	83 fb 05             	cmp    $0x5,%ebx
# 循环五次
  40114b:	7e e8                	jle    401135 <phase_6+0x41>

# 循环结束
# 输入的每个数都要小于等于 6 大于等于 1 且不能有两个数相同

  40114d:	49 83 c5 04          	add    $0x4,%r13
# %r13现在是第二个数的地址
  401151:	eb c1                	jmp    401114 <phase_6+0x20>

  401153:	48 8d 74 24 18       	lea    0x18(%rsp),%rsi
# %rsi = *(%rsp+24)
  401158:	4c 89 f0             	mov    %r14,%rax
# %rax 是第一个数的地址
  40115b:	b9 07 00 00 00       	mov    $0x7,%ecx
# %ecx = 7
  401160:	89 ca                	mov    %ecx,%edx
# %edx=7
  401162:	2b 10                	sub    (%rax),%edx
# %edx = 7 - 输入的数
  401164:	89 10                	mov    %edx,(%rax)
# 更新输入的数
  401166:	48 83 c0 04          	add    $0x4,%rax
# 下一个数
  40116a:	48 39 f0             	cmp    %rsi,%rax
  40116d:	75 f1                	jne    401160 <phase_6+0x6c>
# 遍历输入的数
# 将输入的数 a 变为 7-a

  40116f:	be 00 00 00 00       	mov    $0x0,%esi
  401174:	eb 21                	jmp    401197 <phase_6+0xa3>
# %esi 置零
  401176:	48 8b 52 08          	mov    0x8(%rdx),%rdx
  40117a:	83 c0 01             	add    $0x1,%eax
  40117d:	39 c8                	cmp    %ecx,%eax
  40117f:	75 f5                	jne    401176 <phase_6+0x82>

  401181:	eb 05                	jmp    401188 <phase_6+0x94>
  401183:	ba d0 32 60 00       	mov    $0x6032d0,%edx
# %edx = 0x6032d0
  401188:	48 89 54 74 20       	mov    %rdx,0x20(%rsp,%rsi,2)

  40118d:	48 83 c6 04          	add    $0x4,%rsi
  401191:	48 83 fe 18          	cmp    $0x18,%rsi
  401195:	74 14                	je     4011ab <phase_6+0xb7>

  401197:	8b 0c 34             	mov    (%rsp,%rsi,1),%ecx
# 输入的数字取出来
  40119a:	83 f9 01             	cmp    $0x1,%ecx
# 与 1 比较
  40119d:	7e e4                	jle    401183 <phase_6+0x8f>
# 小于等于 1 跳转
# 大于 1
  40119f:	b8 01 00 00 00       	mov    $0x1,%eax
# %eax = 1
  4011a4:	ba d0 32 60 00       	mov    $0x6032d0,%edx
# %edx = 0x6032d0
  4011a9:	eb cb                	jmp    401176 <phase_6+0x82>


  4011ab:	48 8b 5c 24 20       	mov    0x20(%rsp),%rbx
  4011b0:	48 8d 44 24 28       	lea    0x28(%rsp),%rax
  4011b5:	48 8d 74 24 50       	lea    0x50(%rsp),%rsi
  4011ba:	48 89 d9             	mov    %rbx,%rcx

  4011bd:	48 8b 10             	mov    (%rax),%rdx
  4011c0:	48 89 51 08          	mov    %rdx,0x8(%rcx)
  4011c4:	48 83 c0 08          	add    $0x8,%rax
  4011c8:	48 39 f0             	cmp    %rsi,%rax
  4011cb:	74 05                	je     4011d2 <phase_6+0xde>
  4011cd:	48 89 d1             	mov    %rdx,%rcx
  4011d0:	eb eb                	jmp    4011bd <phase_6+0xc9>
# 遍历链表（重构链表，把节点连起来），可以看看 0x6032d0都装了些什么东西，可以发现是{332, 168, 924, 691, 477, 443}
  4011d2:	48 c7 42 08 00 00 00 	movq   $0x0,0x8(%rdx)
  4011d9:	00
  4011da:	bd 05 00 00 00       	mov    $0x5,%ebp
  4011df:	48 8b 43 08          	mov    0x8(%rbx),%rax
  4011e3:	8b 00                	mov    (%rax),%eax
  4011e5:	39 03                	cmp    %eax,(%rbx)
  4011e7:	7d 05                	jge    4011ee <phase_6+0xfa>
  4011e9:	e8 4c 02 00 00       	callq  40143a <explode_bomb>
  4011ee:	48 8b 5b 08          	mov    0x8(%rbx),%rbx
  4011f2:	83 ed 01             	sub    $0x1,%ebp
  4011f5:	75 e8                	jne    4011df <phase_6+0xeb>
  4011f7:	48 83 c4 50          	add    $0x50,%rsp
# 保证链表中存储的数据前一个比后一个大
  4011fb:	5b                   	pop    %rbx
  4011fc:	5d                   	pop    %rbp
  4011fd:	41 5c                	pop    %r12
  4011ff:	41 5d                	pop    %r13
  401201:	41 5e                	pop    %r14
  401203:	c3                   	retq
```

简单来说，你只需要输入 $1\to 6$ 这六个数，假设存储在 $a[i]$ 中，进行一个逆转 $a[i] = 7-a[i]$ 后，构建一个链表，这个链表满足的是递减顺序，我们需要使新的链表中前一个节点存放的数据值的低 4 字节都大于后一个节点， 我们可以直接去检查这个 `0x6032d0`（使用 `x/12xg 0x6032d0`，需要运行到`4011a9`才能进行检查），或者自己排序（在之前的步骤中，我们已经将索引与数值绑定了，第一个数的索引即为 $1$），于是，排序为：

`3 4 5 6 1 2`

然而这是被逆转后的，我们逆转回去，即可得到正确的输入 `4 3 2 1 6 5`

![Success](https://s2.loli.net/2022/04/10/xfDLgJsI85mEby4.png)

阶段六结束。

## Secret_Phase

这个彩蛋，实际上我们可以在 `bomb.c` 中找到蛛丝马迹，在解决掉 `phase_6` 后，会一段注释

```c
    /* Wow, they got it!  But isn't something... missing?  Perhaps
     * something they overlooked?  Mua ha ha ha ha! */
```

当然如果有开始做之前就乱翻代码的“良好习惯”，会很轻易发现还有个 `fun7` 和 `secret_phase`。

但是我们会发现，我们无法直接进入这个彩蛋阶段。因为每个阶段的进入样式都一个板子，但是或许...还有一个 `phase_defused` 可以看看？

跳转到 `phase_defused` 函数后，直接看 `callq` 这种语句有没有提到 `secret_phase`。（其实有一个更老赖的方法就是，直接`ctrl + f`搜索 `401242`，也就是这个函数的地址，一下就找到了）

那么接下来就是看如何从 `phase_defused` 进入 `secret_phase`

```asm
00000000004015c4 <phase_defused>:
  4015c4:	48 83 ec 78          	sub    $0x78,%rsp
  4015c8:	64 48 8b 04 25 28 00 	mov    %fs:0x28,%rax
  4015cf:	00 00
  4015d1:	48 89 44 24 68       	mov    %rax,0x68(%rsp)
  4015d6:	31 c0                	xor    %eax,%eax
  4015d8:	83 3d 81 21 20 00 06 	cmpl   $0x6,0x202181(%rip)        # 603760 <num_input_strings>

  4015df:	75 5e                	jne    40163f <phase_defused+0x7b>

  4015e1:	4c 8d 44 24 10       	lea    0x10(%rsp),%r8
  4015e6:	48 8d 4c 24 0c       	lea    0xc(%rsp),%rcx
  4015eb:	48 8d 54 24 08       	lea    0x8(%rsp),%rdx

  4015f0:	be 19 26 40 00       	mov    $0x402619,%esi
  4015f5:	bf 70 38 60 00       	mov    $0x603870,%edi
  4015fa:	e8 f1 f5 ff ff       	callq  400bf0 <__isoc99_sscanf@plt>

  4015ff:	83 f8 03             	cmp    $0x3,%eax
  401602:	75 31                	jne    401635 <phase_defused+0x71>

  401604:	be 22 26 40 00       	mov    $0x402622,%esi
  401609:	48 8d 7c 24 10       	lea    0x10(%rsp),%rdi
  40160e:	e8 25 fd ff ff       	callq  401338 <strings_not_equal>
  401613:	85 c0                	test   %eax,%eax
  401615:	75 1e                	jne    401635 <phase_defused+0x71>
  401617:	bf f8 24 40 00       	mov    $0x4024f8,%edi
  40161c:	e8 ef f4 ff ff       	callq  400b10 <puts@plt>
  401621:	bf 20 25 40 00       	mov    $0x402520,%edi
  401626:	e8 e5 f4 ff ff       	callq  400b10 <puts@plt>
  40162b:	b8 00 00 00 00       	mov    $0x0,%eax
  401630:	e8 0d fc ff ff       	callq  401242 <secret_phase>

  401635:	bf 58 25 40 00       	mov    $0x402558,%edi
  40163a:	e8 d1 f4 ff ff       	callq  400b10 <puts@plt>

  40163f:	48 8b 44 24 68       	mov    0x68(%rsp),%rax
  401644:	64 48 33 04 25 28 00 	xor    %fs:0x28,%rax
  40164b:	00 00
  40164d:	74 05                	je     401654 <phase_defused+0x90>
  40164f:	e8 dc f4 ff ff       	callq  400b30 <__stack_chk_fail@plt>
  401654:	48 83 c4 78          	add    $0x78,%rsp
  401658:	c3                   	retq
  401659:	90                   	nop
  40165a:	90                   	nop
  40165b:	90                   	nop
  40165c:	90                   	nop
  40165d:	90                   	nop
  40165e:	90                   	nop
  40165f:	90                   	nop
```

可以看到 `4015d8` 将函数`num_input_strings`的返回值与 $6$ 进行比较，如果不等于 $6$ 则的直接跳过中间代码到达最后的结束部分，很显然这个函数应该是判断输入字符串的数量的，读取了 $6$ 个字符串就不会跳过中间代码了。（其实就是看看是不是到阶段六才发现这个东西，完成阶段六之后就没有发现彩蛋的资格了）

分析中间代码，可以发现又有熟悉的 `sscanf` 函数，我们可以使用 `gdb` 来查看其格式流。这已经在 `Phase_3` 中提过，不再赘述。

![Check](https://s2.loli.net/2022/04/10/pQD8m5WwhenJCg9.png)

发现是需要读取两个数字与一个字符串，但在下一行也为 `%rdi` 指定了地址，检查此地址：

![Check](https://s2.loli.net/2022/04/10/EUpkFvBKZn92NfW.png)

由于我输入了`7 0 0 0 0 0 0`，可以发现这个地址存储的就是输入的字符串。并且我们可以从+240 看出，这应该是第四行输入的字符串，也就是 `Phase_4` 输入的字符串。（因为第五阶段是+320，第三阶段可以自己看看...）

往下看可以发现，先判断了字符串是否相等，那么我们只需要去找`0x402622`处的字符串即可。

![Check](https://s2.loli.net/2022/04/10/nKtW2Z1u6yAwFED.png)

（好呢，人如其名）

那么我们只需要在 `Phase_4` 的时候输入 `7 0 DrEvil` 即可进入 `secret_phase`。

![Entering](https://s2.loli.net/2022/04/10/1Fp2VzvETsRfMwi.png)

```asm
0000000000401242 <secret_phase>:
  401242:	53                   	push   %rbx
  401243:	e8 56 02 00 00       	callq  40149e <read_line>
  401248:	ba 0a 00 00 00       	mov    $0xa,%edx
  40124d:	be 00 00 00 00       	mov    $0x0,%esi
  401252:	48 89 c7             	mov    %rax,%rdi

  401255:	e8 76 f9 ff ff       	callq  400bd0 <strtol@plt>

  40125a:	48 89 c3             	mov    %rax,%rbx
  40125d:	8d 40 ff             	lea    -0x1(%rax),%eax
  401260:	3d e8 03 00 00       	cmp    $0x3e8,%eax
  401265:	76 05                	jbe    40126c <secret_phase+0x2a>
  401267:	e8 ce 01 00 00       	callq  40143a <explode_bomb>

  40126c:	89 de                	mov    %ebx,%esi
  40126e:	bf f0 30 60 00       	mov    $0x6030f0,%edi
  401273:	e8 8c ff ff ff       	callq  401204 <fun7>
  401278:	83 f8 02             	cmp    $0x2,%eax
  40127b:	74 05                	je     401282 <secret_phase+0x40>
  40127d:	e8 b8 01 00 00       	callq  40143a <explode_bomb>
  401282:	bf 38 24 40 00       	mov    $0x402438,%edi
  401287:	e8 84 f8 ff ff       	callq  400b10 <puts@plt>
  40128c:	e8 33 03 00 00       	callq  4015c4 <phase_defused>
  401291:	5b                   	pop    %rbx
  401292:	c3                   	retq
```

还是一样的操作，读一行字符串后赋值给 `%rdi`，随后调用 `strtol` 函数，查阅文档知，此函数可以将一个字符串转换成对应的长整型数值。

在后面，` %rax` 赋值给 `%rbx` 后，将其减 $1$ ，并要求大于 `0x3e8` 。

后续，将输入的值置为`fun7` 的第二个参数，并将 `0x6030f0`置为第一个参数，调用 `fun7`。

调用后，将返回值与 $2$ 比较，若相等则排除成功。

于是 `fun7` 应该返回 $2$。

阅读 `fun7` 的汇编：

```asm
0000000000401204 <fun7>:
  401204:	48 83 ec 08          	sub    $0x8,%rsp
  401208:	48 85 ff             	test   %rdi,%rdi
  40120b:	74 2b                	je     401238 <fun7+0x34>

  40120d:	8b 17                	mov    (%rdi),%edx
  40120f:	39 f2                	cmp    %esi,%edx
  401211:	7e 0d                	jle    401220 <fun7+0x1c>

  401213:	48 8b 7f 08          	mov    0x8(%rdi),%rdi
  401217:	e8 e8 ff ff ff       	callq  401204 <fun7>
  40121c:	01 c0                	add    %eax,%eax
  40121e:	eb 1d                	jmp    40123d <fun7+0x39>

  401220:	b8 00 00 00 00       	mov    $0x0,%eax
  401225:	39 f2                	cmp    %esi,%edx
  401227:	74 14                	je     40123d <fun7+0x39>

  401229:	48 8b 7f 10          	mov    0x10(%rdi),%rdi
  40122d:	e8 d2 ff ff ff       	callq  401204 <fun7>
  401232:	8d 44 00 01          	lea    0x1(%rax,%rax,1),%eax
  401236:	eb 05                	jmp    40123d <fun7+0x39>

  401238:	b8 ff ff ff ff       	mov    $0xffffffff,%eax
  40123d:	48 83 c4 08          	add    $0x8,%rsp
  401241:	c3                   	retq
```

测试输入的地址值是否为 $0$，如果是则返回 $-1$。刚进入这个函数的时候，我们可以检查`0x6030f0`的值，可以发现为`0x24` ，显然不为 $0$。

往后看可以发现，函数会将 `%rdi` 的值与我们输入的值比较，若这个数小于等于我们输入的数就跳至`401220`，将`%eax`置 $0$，再进行一次相同的比较，如果相等则直接返回。

在这之中，还存在着递归，并且这还是存在分支条件的递归，显然可以想到树的左右子树。

我们可以检查`0x6030f0`开始存储的结构：

![Check](https://s2.loli.net/2022/04/10/cVigUev5DETSyQ8.png)

可以看出来这是个二叉树，如图：

![Tree](https://s2.loli.net/2022/04/10/y1GLwZ8n3pToEXF.png)

当 `%edx` 大于输入的数时，令`%rdi`移到它的左子树的位置，接下来调用`fun7`在返回后令`%eax = 2 * %eax`。

当 `%edx` 小于输入的数，令`%rdi`移到它的右子树的位置，接着调用`fun7`，在返回后令`%eax = 2 * %rax + 1`。

也就是说：`%edi`为树上的一个结点，令`%edi`节点的值与输入的值进行比较。

- 如果两者相等：返回 $0$
- 如果前者大于后者：`%rdi`移至左子树，返回`2 * %rax`
- 如果后者大于前者：`%rdi`移至右子树，返回`2 * %rax + 1`

因此，若想返回值为 $2$，按照返回顺序，可以返回` 0, 2 * %rax + 1, 2 * %rax`，于是遍历顺序为，左-右-中。

答案为 `0x16`，即 `22`。

![Success](https://s2.loli.net/2022/04/10/LPdhumYjS9MTxIW.png)

彩蛋结束。

# 总结

没有总结（
