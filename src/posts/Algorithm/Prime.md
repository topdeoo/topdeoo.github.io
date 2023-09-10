---
title: About Prime
date: 2022-03-29 21:05:02
tag:
  - Algorithm
category:
  - Algorithm
math: true
---


> 这里介绍一些关于找素数的方法，可能是素数筛，也可能是快速判断一个数是不是素数

<!--more-->

素数筛，就是在一个给定的范围内，把素数与非素数区分出来。

我们知道，判断一个素数最简单的方法就是使用定义来判断：

```cpp
bool is_prime(int n){
    for(int i = 2; i < n; i++){
        if(n % i == 0)
            return 0;
    }
    return 1;
}
```

显然这种算法是 $O(n)$ 的，检查一个素数就需要 $O(n)$ 的时间，那么检查 $n$ 个素数的复杂度就是 $O(n^2)$，这显然是无法接受的（在OI中）。



于是有一种稍微快一些的方法，可以把判断一个数是不是素数的时间降低到 $O(\sqrt{n})$ ，这种算法的正确性是基于一个显然的事实：若 $t = ab$ 则显然 $t = ba$，因此我们只需要检查到 $\sqrt{n}$ ，若 $\sqrt{n}$ 之前的所有数（ $1$ 除外）都不是 $n$ 的因子，那么 $n$ 一定是素数：

```cpp
bool is_prime(int x){
    for(int i = 2; i <= sqrt(n); i++){
        if(n % i == 0)
            return 0;
    }
    return 1;
}
```

然而，我们有两种经典的素数筛算法，所以你可以当做我上面在扯淡

## 埃氏筛

埃氏筛基于一个简单的事实：要得到自然数n以内的全部素数，必须把不大于根号n的所有素数的倍数剔除，剩下的就是素数。

也就是从 $1$ ~ $n$ 中依次删除 $2$ 的倍数， $3$ 的倍数.....从而得到所有的素数。



```cpp
#define N 500

vector<bool> is_prime(N + 5, true);
vector<int> prime;
void Eratosthenes(int n) {
	for (int i = 2; i <= n; i++) {
		if (is_prime[i]) {
			prime.push_back(i);
			if ((long long)i * i <= n)
				for (int j = i * i; j <= n; j += i)
					is_prime[j] = 0;
		}
	}
}
```

### 算法分析

假设每次对数字的操作都花费 $1$ 个单位时间，显然，时间复杂度为
$$
T(n) = \sum_{p\le n}\frac{n}{p} = n \sum^{\pi(n)}_{k=1}\frac{1}{p_k}
$$

其中， $p_k$ 表示第 $k$ 小的素数，$\pi(n)$ 表示小于等于 $n$ 的素数的个数

又根据 `Mertens' theorems` ：
$$
\exists B_1 \in \mathbf{R} \par
s.t.\quad n \sum^{\pi(n)}_{k=1}\frac{1}{p_k} = \log\log{n} + B_1 + O(\frac{1}{\log n})
$$

因此，埃氏筛的时间复杂度是 $O(n\log\log{n})$ 。接下来证明 `Mertens' theorems` 的弱化版本 $\sum_{k\le \pi(n)}\frac{1}{p_k} = O(\log\log{n})$:
$$
\text{由于} \pi(n) = \Theta(\frac{n}{\log{n}}) \text{,那么第n个素数的大小为} \Theta(n\log{n})\par
\text{于是}\par
\begin{aligned}
\sum^{\pi(n)}_{k=1}\frac{1}{p_k} &=O(\sum^{\pi(n)}_{k=2}\frac{1}{k\log{k}})\par
&=O(\int^{\pi(n)}_2\frac{dx}{x\log{x}})\par
&=O(\log\log{\pi(n)})
=O(\log\log n)
\end{aligned}
$$
事实上，可以将渐进复杂度“降”到 $O(n\log\log{\sqrt{n}})$（因为这个复杂度渐进时间和上面是一样的，所以降字用双引号引起来了），实际做法是：

```cpp
int n;
vector<bool> is_prime(n + 1, true);
is_prime[0] = is_prime[1] = false;
for (int i = 2; i * i <= n; i++) {
  if (is_prime[i]) {
    for (int j = i * i; j <= n; j += i) 
        is_prime[j] = false;
  }
}
```



## 欧拉筛

欧拉筛又叫做线性筛，也就是运行时间为 $O(n)$ 的筛法。

回顾埃氏筛我们可以发现，对一个相同的合数，事实上我们划去了不止 $1$ 次，每次遇到它的质因子时，我们都将其划去了，重复的删去是没有意义的，如果能让每个合数都只被删去一次，那么就可以将时间复杂度降到 $O(n)$ 了。

```cpp
#define N 1e5 + 10;

bool vis[N];
vector<int> primes;
void init(int n){
    vis[0] = vis[1] = 0;
    for(int i = 2; i <= n; i++){
        if(!vis[i]){
            vis[i] = 1;
            primes.push_back(i);
        }
        for(auto &j : primes){
            if(i * j > n)break;
            vis[i * j] = 1;
            if(i % j == 0)break;
        }
    }
}
```

线性筛可以做的事远不止筛出素数，我们可以用线性筛来求欧拉函数，莫比乌斯函数，因子的个数，约数和等等。

这些内容会慢慢补充（大概）

# 一些素性测试

**素性测试**这种方法不需要对数字进行素数分解，可以直接测试一个数是否为素数。

素性测试有两种：

1. 确定性测试：绝对确定一个数是否为素数。常见示例包括 Lucas-Lehmer 测试和椭圆曲线素性证明。
2. 概率性测试：通常比确定性测试快很多，但有可能（尽管概率很小）错误地将合数识别为质数（尽管反之则不会）。因此，通过概率素性测试的数字被称为 **可能素数**，直到它们的素数可以被确定性地证明。而通过测试但实际上是合数的数字则被称为 **伪素数**。有许多特定类型的伪素数，最常见的是费马伪素数，它们是满足费马小定理的合数。

这里只介绍一种我常用的方法。

## Miller-Rabin 素性测试

### 数学原理

首先介绍**费马小定理**：
$$
a^{p-1} \equiv 1(mod\;p)
$$
其中$(a, p) = 1$，因此素数对任意不等于它本身的数都满足上述同余式。

那么是不是一个数 $p$ 对任意 $a$  都满足这个同余式，$p$ 就是一个素数呢？当然是存在反例的，这个反例就是 **卡迈尔数**，这里不去介绍卡迈尔数，可以自行百度😏

但是用费马小定理去判断一个数是不是素数，在大部分情况下是正确的，也就是说，可以大概率相信一个数是素数。

这就是 `Miller-Rabin` 算法的立足点。



但我们仍需要一样定理：**二次探测定理**
$$
\text{若} p \text{奇素数，则} x^2 \equiv 1 (mod\ p)\text{的解为}\par
x\equiv 1(mod\ p)\text{或}x\equiv p-1(mod\ p)
$$
不妨将费马小定理和二次探测定理结合起来使用：

将 $a^{n-1}\equiv 1(mod\ n)$ 中的指数 $n-1$ 分解为 $n-1=2^t*u$ ，在每轮测试中对随机出来的 $a$ 先求出 $a^u \mod n$ ，之后对这个值执行最多 $t$ 次平方操作，若发现非平凡平方根时即可判断出其不是素数，否则通过此轮测试。

时间复杂度为 $O(T\log^3 n)$ 级别, 其中 $T$ 为测试的次数。若使用 `FFT` 优化，复杂度可以降到 $O(T\log^2{n}\log\log{n}\log\log\log{n})$

由于此算法为概率算法，因此是存在误判的，误判的概率为 $\frac{1}{4^T}$，因此当T较大时可视为完备算法，但 $T$ 不能选太大，否则会影响判断的效率，建议大于等于 $8$ 即可。

### 代码实现

```cpp
typedef long long ll;

const ll MOD = 1e9 + 7;
ll qpow(ll a, ll n, ll mod) {
  ll res = 1;
  while (n) {
    if (n & 1) res = res * a % mod;
    a = a * a % mod;
    n >>= 1;
  }
  return res;
}

ll qmul(ll a, ll b, ll mod) {
  ll res = 0;
  while (b) {
    if (b & 1) res = (a + res) % mod;
    a = a * 2 % mod;
    b >>= 1;
  }
  return res;
}

bool Miller_Rabin(ll n) {
  if (n == 2) return true;
  if (!(n & 1) || n < 2) return false;
  ll s = 0, t = n - 1;
  while (!(t & 1)) {
    s++;
    t >>= 1;
  }
  for (int i = 0; i < 20; i++) {
    ll a = rand() % (n - 1) + 1;
    ll x = qpow(a, t, n);
    for (int j = 1; j <= s; j++) {
      ll test = qmul(x, x, n);
      if (test == 1 && x != 1 && x != n - 1) return false;
      x = test;
    }
    if (x != 1) return false;
  }
  return true;
}
```



