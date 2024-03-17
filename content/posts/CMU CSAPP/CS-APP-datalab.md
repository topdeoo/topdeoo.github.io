+++
categories = ['CSAPP', 'CMU']
cover = 'https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230628184041.png'
date = '2022-03-29 19:46:40'
keywordswords = ['CMU', 'CSAPP']
title = 'CS:APP datalab'
description = '一个做了很久，做完之后其实还挺有收获的实验（我愿称之为最难🥺）'
+++

> 前置条件：阅读完第二章


# 实验准备

实验材料 `handout` 下载地址[CS:APP3e, Bryant and O'Hallaron (cmu.edu)](http://csapp.cs.cmu.edu/3e/labs.html)。

只需要下载每个实验中的 `Self-Study Handout` 即可，下载下来后放到与 `docker` 共享文件夹中（文件后缀名为 `.tar`），阅读 `Writeup` 文件，使用 `tar xvf datalab-handout.tar.`命令解压即可。

阅读 `README` 文件，完成需要的测试:

```bash
make clean
make
```

输入`./btest` 可以看见一堆错误信息和 $0$ 分提示，输入`./btest -g` 可以发现错误信息消失了。

这样就可以开始实验了。

我们需要完成的文件是 `bits.c`，完成一个函数后，使用 `make` 编译，并用 `./btest` 来查看得分，当然，在 `bits.c` 中还有格式要求，需要使用 `./dlc bits.c` 来检查格式问题。

# 实验过程

## bitXor

要求使用 非`~` 和 与`&` 组合实现异或`^`。

可以发现：
$$
p \oplus q = p'q + pq' = (p+q)(p'+q') = (p'q')'(pq)'
$$
那么代码就很简单了：

```c
int bitXor(int x, int y) {
    int res = (~(x & y)) & (~((~x) & (~y)));
    return res;
}
```

## tmin

返回`int`型整数补码表示的最小值。

我们知道，最大值是 `0x7fffffff` ，最小值是最大值的相反数-1，也就是 `0x80000000`。

代码如下：

```c
int tmin(void) {
    int res = 1 << 31;
    return res;
}
```

## isTmax

判断输入的 `x` 是否是 `int` 所能表示的最大值。

若 `x` 是最大值，那么显然 `x + 1` 是上述的 `tmin`，而 `~tmin = x`，于是我们可以得到`tmin^x = 0`，也就是`(~(x + 1))^x = 0`

然而，我们会发现，若 `-1 = 0xffffffff` 代入上式也是满足的，因此我们需要排除这种情况。

代码如下：

```c
int isTmax(int x) {
    return !(~(x + 1) ^ x) & !!(x + 1);
}
```

## allOddBits

判断是否所有的奇数位都为`1`。

首先，写出奇数位全为 `1` 且其他位为 `0` 的数，为 `0xAAAAAAAA`。

我们只需要构造一个掩码`flag`，使用掩码与 `x` 的与来取出 `x` 的奇数位，进而判断其是否符合。

正常情况下我们只需要判断 `(x & 0xAAAAAAA)^0xAAAAAAAA` 是否等于 `0` 即可；但这样我们无法过格式测试，于是我们需要将掩码 `flag` 的计算复杂化：先构造出 `0xAAAA0000` ，随后加上 `0x0000AAAA` 即可。

代码如下：

```c
int allOddBits(int x) {
    int flag = 0xAA + (0xAA << 8);
    flag += (flag << 16);
    return !((flag & x) ^ flag);
}
```

## negate

求出 `x` 的相反数。

应该算是最简单的一个了？

```c
int negate(int x) {
    return ~x + 1;
}
```

## isAsciiDigit

判断 `x` 是否满足 $\text{0x30} \le \text{x} \le \text{0x39}$。

首先需要判断，`x` 的第二个四位是否等于`3`，且前面所有位数都为 `0`，可以通过 `(x>>4)^3 == 0 ? 1 : 0` 来判断。

随后，`x` 的第一个四位需要在 `0` 到 `9` 之间，首先，若第四位不为 `1`，那么必然是满足条件的，因此我们只需考虑第四位为`1`的情况，那么只有 `1001/1000`的情况，可以发现中间两位都为 `0`，那么排除这种情况就可以，可以通过 `x & 6 == 0 ? 1 : 0` 来判断中间两位是否为 `0`。

将上述两类判断条件取或后与第一类取与，即可得到

代码如下：

```c
int isAsciiDigit(int x) {
    return (!((x >> 4) ^ 3)) & ((!((x >> 3) & 1)) | !(x & 6));
}
```

## conditional

写一个三目运算符

首先需要判断`x`的真假，`K&R C`中明确的提到，非零即真。因此我们对 `x` 取两次非 `!!x`，即可得到 `0/1`。

三目的意思是，`x`为真即返回 `y`，否则返回 `z`。

不妨假设 `flag = !!x`，现在 `flag = 0/1`，由于不能使用 `if` 语句，因此需要在 `return` 的时候同时返回 `y` 和 `z`，但根据 `flag` 的不同，将其中一个数置为 `0`。

假设`flag = 0`，那么应该返回 `z`，将 `y` 置为 `0`。可以发现 `flag & y == 0 | ~flag & z == z`；将`flag = 1` 代入检验，发现无法返回 `y`。于是我们需要对 `flag` 进行变换，当 `flag = 1` 时，将其变为 `-1`，也就是 `flag = -flag = ~flag + 1`。而显然这对 `flag = 0` 时返回值是正确的。

于是可以写出代码：

```c
int conditional(int x, int y, int z) {
    int flag = !!x;
    flag = ~flag + 1;
    return (flag & y) | (~flag & z);
}
```

## isLessOrEqual

实现一个小于等于号。

如何去判断两个数的大小关系？无非是，符号不同正数大，符号相同比较差值。

先做差，得到 `y - x`，并取出其符号，然后取出 `x` 的符号与 `y` 的符号，并做异或，即可判断 `x` 与 `y` 的符号是否相同，若不同，则判断 `x` 的符号是否为负，否则比较差值的符号。

代码如下：

```c
int isLessOrEqual(int x, int y) {
    int _x = ~x + 1;
    int sub = y + _x;
    int sub_sign = !(sub >> 31);
    int sign = !((x >> 31) ^ (y >> 31));
    return ((!sign) & (x >> 31)) | (sign & sub_sign);
}
```

## logicalNeg

实现逻辑的非`!`。

逻辑非也就是非零即 `1`。因此我们只需要判断输入的 `x` 是否为 `0 `即可。

只需要利用一个简单的性质：`0` 的相反数还是 `0`。我们只需要判断 `x` 与它的相反数 `-x` 取或之后的符号位即可，若为 `0`，则 `x` 必为 `0`。

代码如下：

```c
int logicalNeg(int x) {
    int _x = ~x + 1;
    return ~((_x | x) >> 31) & 1;
}
```

## howManyBits

最难的一题了吧这应该是，连题目都没看吧（

一个数用补码表示最少需要几位？

如果是一个正数，则需要找到它最高的一位是`1`的，再加上符号位，结果为`n + 1`；如果是一个负数，则需要知道其最高的一位是`0`的。

这里需要一个 trick：若`x`为负则按位取反，否则不变。这样可以快速找到最高位为1的。

从高十六位，高八位，高四位，高两位，高一位这样顺次递减，缩小范围，判断是否存在 `1` 。

emmmmm具体看代码吧，这个感觉有些只可意会不可言传的意思？😶

```c
int howManyBits(int x) {
    int b16, b8, b4, b2, b1, b0;
    int sign = x >> 31;
    x = (sign & ~x) | (~sign & x);
    b16 = !!(x >> 16) << 4;
    x = x >> b16;
    b8 = !!(x >> 8) << 3;
    x = x >> b8;
    b4 = !!(x >> 4) << 2;
    x = x >> b4;
    b2 = !!(x >> 2) << 1;
    x = x >> b2;
    b1 = !!(x >> 1);
    x = x >> b1;
    b0 = x;
    return b16 + b8 + b4 + b2 + b1 + b0 + 1;
}
```

## floatScale2

求2乘一个浮点数的值。

分为规格化与非规格化两类来考虑：

首先排除无穷小、0、无穷大和非数值NaN，此时浮点数指数部分（`真正指数+bias`）分别存储的的为0，0，,255，255。这些情况，无穷大和NaN都只需要返回参数（ $\infin, NaN$ ），无穷小和0只需要将原数乘二再加上符号位就行了（并不会越界)。

剩下的情况，如果指数+1之后为指数为255则返回原符号无穷大，否则返回指数+1之后的原符号数。

代码如下：

```c
unsigned floatScale2(unsigned uf) {
    int exp = (uf & 0x7f800000) >> 23;
    if (!exp)
        return (uf << 1) | (uf & (1 << 31));
    else if (exp == 255)
        return uf;
    exp++;
    if (exp == 255)
        return 0x7f800000 | (uf & (1 << 31));
    else
        return (exp << 23) | (uf & 0x807fffff);
}
```

## floatFloat2Int

将浮点数转换为整数。

可以先计算出 $E = exp - bias$。

1. 若 $E<0$（小数），直接返回0
2. 若 $E\ge 31$，则返回规定的溢出值 `0x80000000u`
3. 对于规格化的数，进行正常处理，通过公式 $V = (-1)^s\times M \times 2^E$，先给位数补充上省略的 `1`，判断 `E` 是否小于23，若小于23则需要舍去 `23-E `位。返回时根据符号位返回即可。

代码如下：

```c
int floatFloat2Int(unsigned uf) {
    int exp = ((uf >> 23) & 0xff) - 127;
    if (exp >= 31)return 0x80000000u;
    else if (exp < 0)return 0;
    else {
        int sign = (uf >> 31) & 1;
        int frac = (uf & 0x7fffff) | (1 << 23);
        if (exp < 23) {
            if (sign)return -(frac >> (23 - exp));
            else return frac >> (23 - exp);
        }
        else {
            if (sign)return -frac >> (exp - 23);
            else return frac >> (exp - 23);
        }
    }
}
```

## floatPower2

求 $2.0^x$

先算出偏移后的指数 `e`，判断 `e` 与 0/255的大小关系，根据题目描述返回对应的值。否则返回正常浮点值即可，`frac` 部分为 0，返回 `e<<23`即可。

```c
unsigned floatPower2(int x) {
    int inf = 0xff << 23;
    int exp = 127 + x;
    if (exp <= 0) return 0;
    if (exp >= 255) return inf;
    return exp << 23;
}
```





