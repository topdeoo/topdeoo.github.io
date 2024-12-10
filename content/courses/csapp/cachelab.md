---
title: cache-lab
description: 这个实验倒是比较简单，没什么可说的
tags: [CMU]
date: 2023-10-03
lastmod: 2024-12-10
draft: false
---


# 实验准备

这里有几份资料可以学习 `cache` 的工作原理：

1. [CMU 课程slide](http://www.cs.cmu.edu/afs/cs/academic/class/15213-f15/www/recitations/rec07.pdf)
2. [现代操作系统--原理与实现](https://ipads.se.sjtu.edu.cn/ospi/) page 18
3. CS: APP  page 424

对于实验来说，请仔细阅读 `Write up` 文档，如果需要，请安装下载 `Valgrind`(安装方式请自行 `STFW`)

> 我更换了我的实验环境，从 `WSL2` 迁移到了真实的 `Linux` 平台上，但对于这份实验来说并没有什么影响

# Part A

## 要求

实现一个命令行工具 `csim`，用于模拟 `cache` 的工作原理，其官方版本的功能如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231003135402.png)

其中，参数 `s E b` 的含义如图：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231003135443.png)

> 写命令行工具时，我们可以通过 `#include <unistd.h>` 提供的 `getopt()` 函数来解析命令行参数，这在前文的 slide 中有提到

## Data Structure

首先，我们通过上图来设计 `cache` 的数据结构，显然这是一个矩阵，每一个条目视为一个 `struct` ，其中包括 `valid bit`, `tag`, `block`，当然，我们还需要实现 `LRU` 算法，因此这里我们还需要一个时间戳来记录出现的时间。

于是，可以设计数据结构如下：

```c
struct cache_line {
  u_int16_t valid;
  u_int32_t tag;
  u_int32_t *block;
  u_int32_t timestamp;
} **cache;
```

> 注意到这里的 `block` 我用了数组，实际上甚至可以不需要用这个成员，因为模拟器并不会存储任何数据，只是模拟 `hit`, `missing`, `evict` 而已。


## Control Flow

我们可以设计如下控制流：

```mermaid
sequenceDiagram
	main()->>parsing_cmd(): "Parsing Command Line"
	activate parsing_cmd()
	parsing_cmd()-->>main(): "Some Result"
	deactivate parsing_cmd()
	main()->> eval(): "start to simulate"
	activate eval()
	loop UNTIL EOF
		eval() ->> get_page(): "get page from disk or cache"
		get_page() -x eval(): "finish"
	end
	eval()-->>main(): "finish"
	deactivate eval()
```

分治后，就可以开始解决各个子问题了。

## parsing_cmd

实际上我们可以在 `main` 中实现这部分逻辑：

```c
struct cache_line {
  u_int16_t valid;
  u_int32_t tag;
  u_int32_t *block;
  u_int32_t timestamp;
} **cache;

int S, s, E, b, verbose;

u_int32_t hits, misses, evictions;

char *trace_file;

int main(int argc, char *argv[]) {
  int opt;
  while (-1 != (opt = getopt(argc, argv, "hvs:E:b:t:"))) {
    switch (opt) {
    case 's':
      s = atoi(optarg);
      S = (1 << s);
      break;
    case 'E':
      E = atoi(optarg);
      break;
    case 'b':
      b = atoi(optarg);
      break;
    case 't':
      trace_file = optarg;
      break;
    case 'h':
      fprintf(stdout, "Usage: ./%s [-hv] -s <s> -E <E> -b <b> -y <tracefile>\n \
              -h: Optional help flag that print usage info\n \
              -v: Optional verbose flag that displays trace info\n \
              -s <s>: Number of set index bits (S = 2^s is the number of sets)\n \
              -E <E>: Associativity (number of lines per set)\n \
              -b <b>: Number of block bits (B = 2^b is the block size)\n \
              -t <trace_file>: Name of the valgrind trace to replay\n",
              argv[0]);
      exit(0);
    case 'v':
      verbose = 1;
      break;
    default:
      fprintf(stderr, "Usage: ./%s [-hv] -s <s> -E <E> -b <b> -y <tracefile>\n",
              argv[0]);
      exit(-1);
    }
  }

  // Allocate cache
  cache = (struct cache_line **)malloc(sizeof(struct cache_line *) * S);

  eval();

  // Free cache
  for (int i = 0; i < S; i++) {
    free(cache[i]);
  }
  free(cache);

  printSummary(hits, misses, evictions);

  return 0;
}
```

> 如果不会使用 `getopt`，可以看 slide 或者 `man 3 getopt` 看手册学

大概的骨架并不需要太多解释，我们的重点应该放在 `eval` 函数中。

## eval

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231003145016.png)

由于我们不需要处理除 `S`, `L`, `M` 外的其他字符开头的行（注意你可能会读到 `\r\n` 等字符），并且对每次 `S` `L` `M` 的操作是类似的，都是 `get_page()`，于是，代码是显然的：

```c
void eval() {
  FILE *file = fopen(trace_file, "r");
  char identifier;
  u_int64_t address;
  u_int32_t size;

  while (fscanf(file, "%c %lx,%d", &identifier, &address, &size) != EOF) {
    switch (identifier) {
    case 'I':
    case ' ':
    case '\n':
    case '\r':
      break;
    case 'L':
      get_page(identifier, address, size);
      break;
    case 'S':
      get_page(identifier, address, size);
      break;
    case 'M':
      get_page(identifier, address, size);
      get_page(identifier, address, size);
      break;
    default:
      fprintf(stderr, "Unrecognized identifier: %c\n", identifier);
      exit(-1);
    }
  }
}
```
注意，这里的 `M` 代表修改，所以我们需要先 `L` 一次，然后 `S` 一次，这样就需要更新（或者是 `get`）两次 `page`

而对于 `get_page`，逻辑也是显然的：

1. 通过地址获取 `set_index`, `tag`, `offset` 三个值
2. 查询是否为 `cold miss`，即 `cache[set_index] == NULL`（cache中一条数据都没有）
3. 如果是，则直接从 `disk` 中调入页面，在这里，我们只是把 `cache[set_index]` 中的一行的 `tag` 设置为该地址的 `tag`，并将其设置为有效
4. 如果不是，那么我们查看是否已经被调入到 `cache` 中来了
5. 如果是，则已经找到，将时间戳设置为最新后，更新所有条目的时间戳，然后返回
6. 否则，我们需要从 `disk` 中调入页面

而在调入页面时，我们需要判断此时的 `cache` 中是否已经满了（检查是否所有有效位均为1即可），如果是，那么我们必须驱除出去一页，才能进行调入。

代码如下：

```c
void get_page(char identifier, u_int64_t address, u_int32_t size) {
  u_int32_t offset = address & ((1 << b) - 1);
  u_int32_t set_index = (address >> b) & ((1 << s) - 1);
  u_int32_t tag = address >> (b + s);

  if (verbose) {
    printf("%c %lx,%d ", identifier, address, size);
  }

  if (cache[set_index] == NULL) {
    cache[set_index] =
        (struct cache_line *)malloc(sizeof(struct cache_line) * E);
    insert_page(set_index, tag, offset);
  } else {

    for (int i = 0; i < E; i++) {
      if (cache[set_index][i].valid && cache[set_index][i].tag == tag) {
        hits++;
        cache[set_index][i].timestamp = 1;
        update_cache();
        if (verbose) {
          printf("hit ");
        }
        return;
      }
    }

    insert_page(set_index, tag, offset);
  }

  putchar('\n');
}

void update_cache() {
  for (int i = 0; i < S; i++) {
    struct cache_line *set = cache[i];
    if (set == NULL)
      continue;
    for (int j = 0; j < E; j++) {
      if (set[j].valid) {
        set[j].timestamp++;
      }
    }
  }
}

void insert_page(u_int32_t set_index, u_int32_t tag, u_int32_t offset) {
  misses++;
  printf("miss ");
  struct cache_line *set = cache[set_index];
  for (int i = 0; i < E; i++) {
    if (set[i].valid == 0) {
      set[i].valid = 1;
      set[i].tag = tag;
      set[i].timestamp = 1;
      set[i].block = malloc(sizeof(u_int32_t) * (1 << b));
      set[i].block[offset] = 1;
      update_cache();
      return;
    }
  }
  evict_page(set_index, tag, offset);
}

void evict_page(u_int32_t set_index, u_int32_t tag, u_int32_t offset) {
  evictions++;
  printf("eviction ");
  struct cache_line *set = cache[set_index];
  int max = 0;
  int max_index = 0;
  for (int i = 0; i < E; i++) {
    if (set[i].timestamp > max) {
      max = set[i].timestamp;
      max_index = i;
    }
  }
  set[max_index].valid = 1;
  set[max_index].tag = tag;
  set[max_index].timestamp = 1;
}

```

> 注意这里的 `offset` 其实一点用都没有，当然为了模拟还是让他有点作用了。
>
> 我们在 `evict_page` 的最后，直接将 `tag` 修改为需要调入页面的 `tag`，这样省去了再次 `get_page` 的痛苦。


## 结果

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231003150014.png)


# Part B

这部分想要做出来是简单的，但想要做满分是很难的，后面会详细写一份调优的博客。

最简单的方法就是使用分块，考虑到这里的 `cache` 是 32 字节的，一个 `int` 为 4 字节，所以我们可以八个八个值的来复制，于是代码应运而生：

```c
char transpose_submit_desc[] = "Transpose submission";
void transpose_submit(int M, int N, int A[N][M], int B[M][N]) {
  int tmp0, tmp1, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7;
  for (int i = 0; i < M; i += 8) {
    for (int j = 0; j < N; j += 8) {
      for (int k = i; k < i + 8; k++) {
        tmp0 = A[k][j];
        tmp1 = A[k][j + 1];
        tmp2 = A[k][j + 2];
        tmp3 = A[k][j + 3];
        tmp4 = A[k][j + 4];
        tmp5 = A[k][j + 5];
        tmp6 = A[k][j + 6];
        tmp7 = A[k][j + 7];

        B[j][k] = tmp0;
        B[j + 1][k] = tmp1;
        B[j + 2][k] = tmp2;
        B[j + 3][k] = tmp3;
        B[j + 4][k] = tmp4;
        B[j + 5][k] = tmp5;
        B[j + 6][k] = tmp6;
        B[j + 7][k] = tmp7;
      }
    }
  }
}
```

当然，这份代码是没办法达到最好效果的，`32×32` 矩阵的理论miss值为 $256$，而我们的结果为 $288$

如果用这个代码去考虑 `64×64` 的矩阵，那么 miss 会达到惊人的 $4612$，显然是无法接受的，这里的做法可以是减少分块的大小，例如我们用 `4×4` 的分块，那么就可以减少 miss 的值：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231003150721.png)

