---
title: 2023 NENU夏令营机试题解
description: 2023 NENU夏令营机试 Tutorial
tags:
  - NENU
  - 一些随笔
  - 算法讲义
date: 2023-09-20
lastmod: 2024-12-15
draft: false
---

> 本人出了其中三题，来谢罪了

因为说不能出难题，所以就挑了几个简单的题目，数据基本上是随机生成的，也没有故意卡人，应该做题体验不算很差吧（

按照难度来讲解吧

# CF 1000

## 奶牛的二次元生活

### Tutorial

我们考虑二元组 $<x_i, y_i>$，当前的能力值 $s$，题目显然是一个贪心，我们期望通过拿到更大的 $y_i$，让我们获取所有的二元组。换而言之，我们需要先欺负风险小收益大的，先升级，最后再去打最终 boss。那么，只需要排序后依次打过去就行。

### Solution

```cpp
#include <bits/stdc++.h>

using namespace std;

int main(void) {

  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  int s, n;

  cin >> s >> n;

  vector<pair<int, int>> boss(n);
  for (auto &boss_i : boss)
    cin >> boss_i.first >> boss_i.second;

  sort(boss.begin(), boss.end(), [](pair<int, int> &lhs, pair<int, int> &rhs) {
    if (lhs.first == rhs.first)
      return lhs.second > rhs.second;
    return lhs.first < rhs.first;
  });

  bool flag = true;

  for (auto &boss_i : boss) {
    if (s <= boss_i.first) {
      flag = false;
      break;
    }
    s += boss_i.second;
  }

  if (flag)
    cout << "YES" << endl;
  else
    cout << "NO" << endl;

  return 0;
}

```

## windlinxy 的回文数

### Tutorial

简单的数学，实际上看见数据范围就会明白，这一定不是模拟题，如果仔细看样例的话，可以大胆猜测规律就是输入的 $n$ 接上 $n$ 反过来。证明如下：

显然，第一个偶数长度的回文数为 $11$，而显然我们可以发现，偶数长度的回文串一定是 $11$ 的倍数，而 $11$ 的倍数的特征是前半部分与后半部分的和相等，于是我们考虑两个偶数长度的回文数，$a$ 与 $b$，可以发现，$a < b$ 当前仅当其前半部分也同样满足小于关系。

那么我们可以发现，第 $n$ 个偶数长度的回文数的前半部分实际上就是 $n$ 自己。

### Solution

```cpp
#include <bits/stdc++.h>

using namespace std;

int main(void) {

  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  string s;
  cin >> s;
  string ss = s;
  reverse(ss.begin(), ss.end());
  cout << ss << s << endl;

  return 0;
}
```

# CF 1000 ～ 1300

## virgil 的字符串

### Tutorial

简单的想法，显然如果 $S$ 长度大于 26 就肯定不行了，否则只需要看 $S$ 的前 26 个字符改完之后能不能做到全不相同，最少改多少个即可(最少这里，只需要贪心的去考虑就可以)

### Solution

```cpp
#include <bits/stdc++.h>

using namespace std;

int num[26];

int main(void) {
  ios::sync_with_stdio(false);
  set<int> cnt;
  int n;
  cin >> n;
  string s;
  cin >> s;
  for (auto i : s) {
    cnt.insert(i);
    num[i - 'a']++;
  }
  if (cnt.size() == 26 && n > 26)
    cout << -1 << endl;
  else {
    int res = 26 - cnt.size();
    for (int i = 0; i < 26; i++) {
      if (num[i] >= 2) {
        res = res - num[i] + 1;
        num[i] = 1;
      }
      if (res < 0) {
        cout << -1 << endl;
        return 0;
      }
    }
    cout << 26 - cnt.size() - res << endl;
  }
  return 0;
}
```

## virgil 的 LCS

### Tutorial

基础的 `LCS`，不会的话请自行百度什么是 `LCS`

### Solution

```cpp
#include <bits/stdc++.h>
#include <cstring>

using namespace std;

int dp[1005][1005];

int main(void) {

  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  string a, b;

  while (cin >> a >> b) {
    memset(dp, 0, sizeof dp);
    int n = a.size(), m = b.size();
    for (int i = 0; i < n; i++) {
      for (int j = 0; j < m; j++) {
        if (a[i] == b[j])
          dp[i + 1][j + 1] = dp[i][j] + 1;
        else
          dp[i + 1][j + 1] = max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    cout << dp[n][m] << endl;
  }

  return 0;
}

```

# CF 1300

## 鼠鼠们的网上冲浪

### Tutorial

这题可以参考 [[codeforces-practice]] 文章中的(链接为[Practice](http://localhost:8080/posts/Algorithm/codeforces-practice.html)) H. Beppa and SwerChat

### Solution

```cpp
#include <bits/stdc++.h>

using namespace std;

int main(void) {

  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  int t;
  cin >> t;
  while (t--) {
    int n;
    cin >> n;
    vector<int> prev(n), now(n);
    int ans = 0;
    for (auto &x : prev)
      cin >> x;
    for (auto &x : now)
      cin >> x;
    for (auto prev_ptr = prev.rbegin(), now_ptr = now.rbegin();
         prev_ptr != prev.rend() && now_ptr != now.rend(); prev_ptr++) {

      if (*prev_ptr == *now_ptr) {
        now_ptr++;
        ans++;
      }
    }

    cout << n - ans << endl;
  }

  return 0;
}

```

## virgil 想要完美平衡

### Tutorial

为了使 `cost` 最小化，我们应该只在有两个连续位置（且值相反）需要更改时才使用交换操作。对于其他需要位置，我们可以使用翻转操作。

### Solution

```cpp
#include <bits/stdc++.h>

using namespace std;

int main() {
  ios_base::sync_with_stdio(false);
  cin.tie(nullptr);
  cout.tie(nullptr);
  int n;
  cin >> n;
  string s, t;
  cin >> s >> t;
  int i = 0;
  int ans = 0;
  while (i < n)
    if (s[i] != t[i]) {
      if (i + 1 < n && s[i + 1] != t[i + 1] && s[i] != s[i + 1]) {
        ans++;
        i += 2;
      } else {
        ans++;
        i++;
      }
    } else
      i++;
  cout << ans << endl;
  return 0;
}
```
