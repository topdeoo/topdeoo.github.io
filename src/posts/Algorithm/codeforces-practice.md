---
title: Codeforces Practice
math: true
date: 2023-05-16 15:58:30
tag:
  - Algorithm
  - Virgil
category:
	- InNight
---

> 为了机试的一些复健训练

<!--more-->

# [C. Scoring Subsequences](https://codeforces.com/contest/1794/problem/C)

最开始的想法是一个贪心，考虑 $ans[i]$ 为 $a_1, ..., a_i$ 的 $cost$ 值，那么对于 $ans[i+1]$ ，我们只需要考虑新加入的 $a_{i+1}$ 与 $i+1$ 的比值是否大于等于 $1$ 即可

这个想法有一部分是正确的，我们首先考虑，如何计算 $a_1, ..., a_k$ 的 $cost$ 

1首先根据题意，我们知道此序列单调不降，也就是 $a_1 \leq a_2 \leq ...\leq a_k$，于是我们可以构造出一个序列，延续上面的想法，我们可以构造出：$\frac{a_1}{k}, ..., \frac{a_k}{1}$，显然这个序列也是单调不降的。

为什么会构造这个序列呢，我们可以发现，$a_1, ..., a_k$ 的 $cost$ 值，事实上是需要我们去计算所谓的最大 $score$ 值，要想这个值最大，那么显然我们上面的连乘要尽可能大于下面的阶乘，拆分开来看，我们就可以构造出这样一个序列。

通过在这个序列中选取 $\frac{a_i}{k-i+1} \geq 1$ 的 $a_i$，就可以得到最大的 $score$ 值，其个数就是所求的 $cost$ 了

换个思路，实际上我们在 $a_0, a_1, ..., a_{k-1}$ 这个序列中找到第一个 $i$ 使得 $a_i + i < k$ 即可，这显然可以使用二分搜索（注意这个序列从 $0$ 开始）

二分还真是难写啊……

```cpp
#include <bits/stdc++.h>

using namespace std;

int binarySearch (const vector<int> &a, const int &k) {
    int l = 0, r = k - 1;
    while (l < r) {
        int mid = l + (r - l) / 2;
        if (a[mid] + mid >= k)
            r = mid;
        else
            l = mid + 1;
    }
    return l;
}

int main () {
    int t;
    cin >> t;
    while (t--) {
        int n;
        cin >> n;
        vector<int> a(n);
        for (auto &x: a)cin >> x;
        for (int k = 1; k <= n; k++) {
            int ans = binarySearch(a, k);
            cout << k - ans << " ";
        }
        cout << endl;
    }
    return 0;
}

```

# [H. Beppa and SwerChat](https://codeforces.com/contest/1776/problem/H)

最开始的想法是做一个 `map<int, int>` 存储 `<value, index>` 其中 `value` 代表人的编号，`index` 代表了在九点中在线的次序索引，然后对比十点的人员出现次序，如果发现次序提升了，就说明一定登录过，但这个方法不能处理第三个样例：

```cpp
8
8 2 4 7 1 6 5 3
5 6 1 4 8 2 7 3
```

这里应该有4个，因为4号一定登录过，但按照上述算法是无法判断的。

第二个想法是对比两次登录的编号，找到出现顺序是相同的最长序列（实际上是相对位置一定一致），直接 $n - len$ 即可，当然我们需要特判类似 `2 3 1 `， `2 1 3` 这种情况，这里的 `2` 显然是比 `1` 后登录的，也必然在线

发现第二个想法没啥问题，错误就错在应该从后往前判断，如果从前往后的话，在这个例子中会被卡住：

```cpp
4
1 4 2 3
1 4 3 2
```

显然这里，`1 4 3` 都登录了，只有 `2` 没登录，但是如果从前往后遍历，会认为 `1 4` 都没登录……

（大致思路对了，看来脑子还没啥大问题

还把 `rbegin()` 写成 `cbegin()` 了，完全忘记反向迭代器是什么了

```cpp
#include <bits/stdc++.h>

using namespace std;

int main() {

    int t;
    cin >> t;
    while (t--) {
        int n;
        cin >> n;
        vector<int> prev(n), now(n);
        int ans = 0;
        for (auto &x: prev)cin >> x;
        for (auto &x: now)cin >> x;
        for (auto prev_ptr = prev.rbegin(), now_ptr = now.rbegin();
             prev_ptr != prev.rend() && now_ptr != now.rend();
             prev_ptr++) {

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

# [C1. Good Subarrays (Easy Version)](https://codeforces.com/contest/1736/problem/C1)

最开始题目理解错了，以为 $a_i \geq i$ 里面的 $i$ 是针对原序列而言的，发现第三个样例怎么都过不去，重读一边发现这个 $i$ 是构造出来的子序列的 $i$

然后就去看题解了（悲

甚至一开始都没看明白题解的 `dp` ，当然可以用 `dp` 我确实反应过来了，毕竟这个最优子结构确实挺明显的

题解的想法是 $dp[i]$ 表示以 $i$ 为结尾的好区间的最大长度，于是我们考虑状态转移，对于 $dp[i+1]$ ，我们考虑 $a[i+1]$ 与 $dp[i] + 1$ 的大小：

1. 若 $a[i+1] \geq dp[i] +1$ ， 则显然我们可以将 $a[i+1]$ 添加到好区间的末尾，这样仍然是一个好区间
2. 否则，我们不能继承，那么我们考虑当前位置好区间的最大长度，可以发现，我们定死 $a[i+1]$ 后（即让它为右区间端点），那么显然我们的左区间端点最多往前移动 $a[i+1]$ ，前面的均会满足好区间的要求（这是 $dp[i]$ 所保证的）

于是，我们可以写出状态方程为 `dp[i] = min{dp[i-1] + 1, a[i]}`


```cpp
#include <bits/stdc++.h>

using namespace std;

int main() {

    int t;
    cin >> t;
    while (t--) {
        int n;
        cin >> n;
        long long dp_prev = 0, dp, ans = 0;
        for (int i = 0; i < n; i++) {
            int x;
            cin >> x;
            dp = min(dp_prev + 1, (long long) x);
            dp_prev = dp;
            ans += dp;
        }
        cout << ans << endl;
    }

    return 0;
}

```

# [F. Longest Strike](https://codeforces.com/contest/1676/problem/F)

一个简单题，很容易就能想到思路，用一个 `unordered_map` 记录数字出现的次数，然后选取其中出现次数大于等于 $k$ 的元素出来组成一个数组，针对这个数组，我们只需要找到排序后的最长连续子序列即可。

但我T了……

不知道为什么会T

![image-20230517021706740](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230517021706740.png)

没事了，原来还真有人故意 `hack` `unordered_map` 啊

换成 `map` 就过了

```cpp
#include <bits/stdc++.h>

using namespace std;

int main() {

    int t;
    cin >> t;
    while (t--) {
        int n, k;
        cin >> n >> k;
        map<int, int> m;
        for (int i = 0; i < n; i++) {
            int x;
            cin >> x;
            m[x]++;
        }

        vector<int> v;
        for (auto &[val, count]: m) {
            if (count >= k)
                v.emplace_back(val);
        }

        if (v.empty()) {
            cout << -1 << endl;
            continue;
        } else if (v.size() == 1) {
            cout << v[0] << ' ' << v[0] << endl;
            continue;
        }

        sort(v.begin(), v.end());
        int l = 0, r = 0, max_len = -1, best_l;
        for (int i = 1; i < v.size();) {
            while (v[i - 1] + 1 == v[i] && i < v.size())i++;
            r = i;
            if (r - l > max_len) {
                max_len = r - l;
                best_l = l;
            }
            l = i;
            i++;
        }

        cout << v[best_l] << ' ' << v[best_l + max_len - 1] << endl;
    }

    return 0;
}

```

![image-20230517021859798](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230517021859798.png)

甚至 `map` 比哈希表还快，人看傻了，明天试试看之前看见的 `custom hash` 能不能不被卡常

# [C. Number of Pairs](https://codeforces.com/contest/1538/problem/C)

最初想法是开两个 `multiset` 分别存左端点 $l - a[i]$ 和右端点$r - a[i]$，然后对于新加入的 $a[i+1]$ ，考虑在这两个集合中的交集即可

但过不去类似：

```cpp
5 3 3 
3 1 4 1 4
```

这种数据，因为左端点与右端点的计数并未考虑索引，所以可能导致可行的范围但索引不可行，例如这里这两个 `mulitset` 是一致的，均为 `<0>, <2>, <-1>` ，考虑 `1` ，我们左端点可以选择 `<0>, <-1>` ， 右端点选择 `<2>`，但这里的索引是不正确的

换个想法，考虑两个子问题：

1. $a_i + a_j \leq r$
2. $a_i + a_j \leq l-1$

于是，我们可以发现，题目的答案其实就是第一个集合的势减去第二个集合的势，那么我们很简单就能写出代码，注意这里我们排序了，事实上排序对 $i, j$ 的选择并无影响，而只需要满足 $i<j$，因此我们对序列进行顺序考虑即可，对每一个 $a_i$ ，我们考虑 $a[0, i-1]$ 中不大于 $r - a_i$ 与 $l - 1 - a_i$ 的个数，然后相减即可。

```cpp
#include <bits/stdc++.h>

using namespace std;

int main () {

    int t;
    cin >> t;
    while (t--) {
        int n, l, r;
        cin >> n >> l >> r;
        vector<int> a(n);
        for (auto &x: a) cin >> x;
        sort(a.begin(), a.end());
        long long ans = 0;
        for (int i = 1; i < a.size(); i++) {
            ans = ans + (upper_bound(a.begin(), a.begin() + i, r - a[i]) - a.begin()) -
                  (upper_bound(a.begin(), a.begin() + i, l - a[i] - 1) - a.begin());
        }
        cout << ans << endl;
    }

    return 0;
}

```

# [A. Strange Birthday Party](https://codeforces.com/contest/1470/problem/A)

简单的贪心，欲求得最小消费，显然我们对于 $k_i$ 较大的元素，我们应该尽可能的让他能够选到最便宜的礼物（这是因为礼物的价格是单调不降的，因此索引越大礼物越贵），所以我们只需要对 $k$ 从大到小排序，然后按照这个策略选择即可，如果已经选不到礼物，例如 $k_i < j$ 此 $j$ 为最便宜礼物的索引，或者 $c_j > c_{k_i}$ 我们不如直接送钱给人家，累加起来就是最终答案

```cpp
#include <bits/stdc++.h>

using namespace std;

int main () {

    int t;
    cin >> t;
    while (t--) {
        int n, m;
        cin >> n >> m;
        vector<int> k(n), c(m);
        for (auto &x: k)cin >> x;
        for (auto &x: c)
            cin >> x;

        sort(k.begin(), k.end(), [] (const int &a, const int &b) { return a > b; });
        long long ans = 0;
        pair<int, int> min_val = { c[0], 1 };
        int index = 0;
        for (auto &k_i: k) {
            if (min_val.second > k_i || min_val.first > c[k_i - 1]) {
                ans += c[k_i - 1];
            } else {
                ans += min_val.first;
                index++;
                min_val = { c[index], index + 1};
            }
        }
        cout << ans << endl;
    }

    return 0;
}

```

# [B. Shuffle](https://codeforces.com/contest/1366/problem/B)

简单的数学题，可以发现，我们只需要判断 $l_i， r_i$  之间是否存在交集，如果存在，则取其并集，否则跳过，最后拿到一个最大的并集，判断 $x$ 是否在这个范围内，如果是则输出区间大小，否则输出 $1$，能这么做的原因是因为可以原地无限交换，所以对于 $x$ 在 $l_i, r_i$ 之间的情况只需要进行一次交换，如果有重合的话，则需要进行中继交换（换到区间重合的位置，在下一次再换过去）

```cpp
#include <bits/stdc++.h>

using namespace std;

int main () {

    int t;
    cin >> t;
    while (t--) {
        int n, m, x;
        cin >> n >> x >> m;
        int l_most = x, r_most = x;
        for (int i = 0; i < m; i++) {
            int l, r;
            cin >> l >> r;
            if (r_most >= l) {
                r_most = max(r_most, r);
            }
            if (l_most <= r) {
                l_most = min(l_most, l);
            }
        }
        if (x >= l_most && x <= r_most)
            cout << r_most - l_most + 1 << endl;
        else
            cout << 1 << endl;
    }

    return 0;
}

```

## [B. Most socially-distanced subsequence](https://codeforces.com/contest/1364/problem/B)

一开始没思路，确实是退化了

但细看可以发现，这个最大值其实是固定的，就是原排列的相邻项之差绝对值之和

所以，我们只需要考虑如何在这个序列中去掉最多的值，使得长度最小即可

由于 $|a-b| + |b-c| = |a-c|$ 当前仅当 $a, b,c $ 三数单调，所以这里给出解法是，对于任意的单调子串，留两头即可

代码确实有点难写（？

```cpp
#include <bits/stdc++.h>

using namespace std;

int main() {

    int t;
    cin >> t;
    while (t--) {
        int n;
        cin >> n;
        vector<int> a(n), ans;
        for (auto &x: a)cin >> x;
        for (int i = 0; i < a.size() - 1;) {
            int l = i;
            if (a[i + 1] > a[i]) {
                while (i < a.size() - 1 && a[i + 1] > a[i])i++;
            } else {
                while (i < a.size() - 1 && a[i + 1] < a[i])i++;
            }
            if (ans.empty() || *ans.rbegin() != a[l])
                ans.emplace_back(a[l]);
            ans.emplace_back(a[i]);
        }
        if (*ans.rbegin() != *a.rbegin())
            ans.emplace_back(*a.rbegin());
        cout << ans.size() << endl;
        for (auto &i: ans)
            cout << i << ' ';
        cout << endl;
    }

    return 0;
}

```

![image-20230518002236731](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230518002236731.png)

# [B. Beautiful Numbers](https://codeforces.com/contest/1265/problem/B)

简单题（好像也不算很简单）

用一个 $index[i]$ 表示 $i$ 在原排列中的位置（从 $1$ 开始），随后开始对$m = 1, .., n$ 开始考虑是否满足条件。

注意到 $m = 1$ 是平凡的，考虑 $m = i + 1$，我们有两种情况：

1. $m = i$ 满足条件，那么显然，我们只需要对 $index[i+1]$ 考虑是否存在于上一个满足的边界上，这里要求我们记录 $l_i, r_i$，我们只需判断 $index[i+1] = l_i -1 \or index[i+1] = r_i + 1$ 是否成立即可，若成立，则可以 $m = i+1$ 满足，否则不满足
2. $m = i$ 不满足条件，那么显然我们需要将 $index[i]$ 作为边界进行记录，而对 $m = i+1$ 时，我们需要判断 $index[i+1]$ 是否在 $l_i, r_i$ 之间，并且 $r_i - l_i +1$ 是否等于 $i+1$ （即这段区间是全排列，而不是多了其他元素）

```cpp
#include <bits/stdc++.h>

using namespace std;

int main() {

    int t;
    cin >> t;
    while (t--) {
        int n;
        cin >> n;
        vector<int> book(n + 1);
        for (int i = 0; i < n; i++) {
            int x;
            cin >> x;
            book[x] = i + 1;
        }
        string ans = "1";
        int l = book[1], r = book[1];
        for (int i = 1; i < n; i++) {
            if (ans[i - 1] == '1') {
                if (book[i + 1] == l - 1 || book[i + 1] == r + 1)
                    ans += "1";
                else
                    ans += "0";
            } else {
                if (book[i + 1] >= l && book[i + 1] <= r && r - l + 1 == i + 1)
                    ans += "1";
                else
                    ans += "0";
            }
            l = min(book[i + 1], l);
            r = max(book[i + 1], r);
        }
        cout << ans << endl;
    }

    return 0;
}

```

# [B. Balanced Tunnel](https://codeforces.com/contest/1237/problem/B)

```cpp
#include <bits/stdc++.h>

using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(0);
  int n;
  cin >> n;
  vector<int> a(n), b(n);
  for (int i = 0; i < n; i++) {
    cin >> a[i];
    --a[i];
  }
  for (int i = 0; i < n; i++) {
    cin >> b[i];
    --b[i];
  }
  vector<int> pos(n);
  for (int i = 0; i < n; i++) {
    pos[b[i]] = i;
  }
  vector<int> c(n);
  for (int i = 0; i < n; i++) {
    c[i] = pos[a[i]];
  }
  int mx = -1, ans = 0;
  for (int i = 0; i < n; i++) {
    if (c[i] > mx) {
      mx = c[i];
    } else {
      ++ans;
    }
  }
  cout << ans << '\n';
  return 0;
}

```

## [1B2. TV Subscriptions (Hard Version)](https://codeforces.com/contest/1225/problem/B2)

```cpp
#include <bits/stdc++.h>

using namespace std;

int main () {

    int t;
    cin >> t;
    while (t--) {
        int n, k, d;
        cin >> n >> k >> d;
        vector<int> a(n);
        set<int> s;
        map<int, int> vis;
        for (auto &x: a)cin >> x;
        for (int i = 0; i < d; i++) {
            vis[a[i]]++;
            if (vis[a[i]] > 0)
                s.insert(a[i]);
        }
        int ans = (int) s.size();
        for (int i = 0; i < n - d; i++) {
            vis[a[i]]--;
            vis[a[i + d]]++;
            if (vis[a[i + d]] == 0)
                s.insert(a[i + d]);
            if (vis[a[i]] == 0)
                s.erase(a[i]);
            ans = min(ans, (int) s.size());
        }
        cout << ans << endl;
    }
    return 0;
}

```

# [C. Brutality](https://codeforces.com/contest/1107/problem/C)

```cpp
#include <bits/stdc++.h>

using namespace std;

int main() {
	
	int n, k;
	cin >> n >> k;
	vector<int> a(n);
	for (int i = 0; i < n; ++i) {
		cin >> a[i];
	}
	string s;
	cin >> s;
	
	long long ans = 0;
	for (int i = 0; i < n; ++i) {
		int j = i;
		vector<int> vals;
		while (j < n && s[i] == s[j]) {
			vals.push_back(a[j]);
			++j;
		}
		sort(vals.rbegin(), vals.rend());
		ans += accumulate(vals.begin(), vals.begin() + min(k, int(vals.size())), 0ll);
		i = j - 1;
	}
	
	cout << ans << endl;
	
	return 0;
}

```

# [A. Reorder the Array](https://codeforces.com/problemset/problem/1007/A)

```cpp
#include <bits/stdc++.h>

using namespace std;

int main () {

    int n;
    cin >> n;
    vector<int> a(n);
    for (auto &x: a)cin >> x;
    sort(a.begin(), a.end());
    int ans = 0, r = 0;
    for (int i = 0; i < a.size(); i++) {
        while (r < n && a[r] <= a[i])
            r++;
        if (r < n)
            ans++, r++;
    }
    cout << ans << endl;
    return 0;
}

```



