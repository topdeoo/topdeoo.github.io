---
title: NJU ICS PA-1
description: ICS PA1 sdb
tags:
  - NJU
  - ICS
date: 2023-07-16
lastmod: 2024-12-10
draft: false
---

**计算机可以没有寄存器吗? (建议二周目思考)**

如果没有寄存器, 计算机还可以工作吗? 如果可以, 这会对硬件提供的编程模型有什么影响呢?

就算你是二周目来思考这个问题, 你也有可能是第一次听到"编程模型"这个概念. 不过如果一周目的时候你已经仔细地阅读过 ISA 手册, 你会记得确实有这么个概念. 所以, 如果想知道什么是编程模型, RTFM 吧.

> [!example]
>
> 可以没有寄存器，通过对 cache 中每个单元进行命名，实际上也能达到寄存器的效果
>
> 编程模型（Programming model）是指一种描述计算机程序运行方式的抽象概念。它定义了程序员与计算机系统之间的交互方式，包括如何表示数据、如何组织代码、如何控制程序的执行流程等。
>
> 编程模型通常包含一组规则，用于指导程序员创建程序，并定义了程序员需要使用的特定编程语言、API、库和工具集。编程模型的设计可以极大地影响程序的可维护性、可扩展性和可重用性。
>
> 常见的编程模型包括面向过程编程（Procedural Programming）、面向对象编程（Object-Oriented Programming）、函数式编程（Functional Programming）、事件驱动编程（Event-Driven Programming）等。每种编程模型都有其独特的特点，可以根据不同的需求选择合适的编程模型来进行编程。

**kconfig 生成的宏与条件编译**

我们已经在上文提到过, kconfig 会根据配置选项的结果在 `nemu/include/generated/autoconf.h`中定义一些形如`CONFIG_xxx`的宏, 我们可以在 C 代码中通过条件编译的功能对这些宏进行测试, 来判断是否编译某些代码. 例如, 当`CONFIG_DEVICE`这个宏没有定义时, 设备相关的代码就无需进行编译.

为了编写更紧凑的代码, 我们在`nemu/include/macro.h`中定义了一些专门用来对宏进行测试的宏. 例如`IFDEF(CONFIG_DEVICE, init_device());`表示, 如果定义了`CONFIG_DEVICE`, 才会调用`init_device()`函数; 而`MUXDEF(CONFIG_TRACE, "ON", "OFF")`则表示, 如果定义了`CONFIG_TRACE`, 则预处理结果为`"ON"`(`"OFF"`在预处理后会消失), 否则预处理结果为`"OFF"`.

这些宏的功能非常神奇, 你知道这些宏是如何工作的吗?

> 预处理器解析替换

**为什么全部都是函数?**

阅读`init_monitor()`函数的代码, 你会发现里面全部都是函数调用. 按道理, 把相应的函数体在`init_monitor()`中展开也不影响代码的正确性. 相比之下, 在这里使用函数有什么好处呢?

> 面向过程编程的一种编程范式

**参数的处理过程**

另外的一个问题是, 这些参数是从哪里来的呢?

> 命令行接收的参数

**究竟要执行多久?**

在`cmd_c()`函数中, 调用`cpu_exec()`的时候传入了参数`-1`, 你知道这是什么意思吗?

> [!example]
>
> 表示一次 `yield`，具体可查看 `cpu_exec()` 中对参数 `n` 的调用：
>
> ```c
> static void execute(uint64_t n) {
>   Decode s;
>   for (;n > 0; n --) {
>     exec_once(&s, cpu.pc);
>     g_nr_guest_inst ++;
>     trace_and_difftest(&s, cpu.pc);
>     if (nemu_state.state != NEMU_RUNNING) break;
>     IFDEF(CONFIG_DEVICE, device_update());
>   }
> }
> ```
>
> 可以发现，当 `n` 为 -1 时并不会进入循环

**潜在的威胁 (建议二周目思考)**

"调用`cpu_exec()`的时候传入了参数`-1`", 这一做法属于未定义行为吗? 请查阅 C99 手册确认你的想法.

> [!example]
>
> 根据 `GPT` 的解释：
>
> C99 标准中定义了一些行为，如果程序中出现了这些行为，编译器或运行时环境可以采取任意的行动，包括崩溃、输出错误结果、产生不可预测的行为等。这些行为被称为未定义行为（Undefined Behavior）。
>
> 以下是一些常见的未定义行为：
>
> - 访问未初始化的变量：未初始化的变量的值是未定义的，它可能包含任意值，包括程序崩溃的值。
> - 数组越界访问：访问数组越界是一种未定义的行为，它可能导致程序崩溃、产生不可预测的结果或被攻击者利用。
> - 使用空指针：使用空指针是一种未定义的行为，它可能导致程序崩溃或产生不可预测的结果。
> - 除数为零：除以零是一种未定义的行为，它可能导致程序崩溃或产生不可预测的结果。
> - 同时修改同一变量的多个线程：在多线程程序中，如果多个线程同时修改同一个变量，则可能导致数据竞争，产生不可预测的结果。
>
> 在这里传入的 `-1` 并不属于未定义行为

**谁来指示程序的结束?**

在程序设计课上老师告诉你, 当程序执行到`main()`函数返回处的时候, 程序就退出了, 你对此深信不疑. 但你是否怀疑过, 凭什么程序执行到`main()`函数的返回处就结束了? 如果有人告诉你, 程序设计课上老师的说法是错的, 你有办法来证明/反驳吗? 如果你对此感兴趣, 请在互联网上搜索相关内容.

>

**有始有终 (建议二周目思考)**

对于 GNU/Linux 上的一个程序, 怎么样才算开始? 怎么样才算是结束? 对于在 NEMU 中运行的程序, 问题的答案又是什么呢?

与此相关的问题还有: NEMU 中为什么要有`nemu_trap`? 为什么要有 monitor?

>

# sdb 实现

| 帮助(1)      | `help`        | `help`            | 打印命令的帮助信息                                                                                                                  |
| ------------ | ------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 继续运行(1)  | `c`           | `c`               | 继续运行被暂停的程序                                                                                                                |
| 退出(1)      | `q`           | `q`               | 退出 NEMU                                                                                                                           |
| 单步执行     | `si [N]`      | `si 10`           | 让程序单步执行`N`条指令后暂停执行, 当`N`没有给出时, 缺省为`1`                                                                       |
| 打印程序状态 | `info SUBCMD` | `info r` `info w` | 打印寄存器状态 打印监视点信息                                                                                                       |
| 扫描内存(2)  | `x N EXPR`    | `x 10 $esp`       | 求出表达式`EXPR`的值, 将结果作为起始内存 地址, 以十六进制形式输出连续的`N`个 4 字节                                                 |
| 表达式求值   | `p EXPR`      | `p $eax + 1`      | 求出表达式`EXPR`的值, `EXPR`支持的 运算请见[调试中的表达式求值](https://nju-projectn.github.io/ics-pa-gitbook/ics2022/1.6.html)小节 |
| 设置监视点   | `w EXPR`      | `w *0x2000`       | 当表达式`EXPR`的值发生变化时, 暂停程序执行                                                                                          |
| 删除监视点   | `d N`         | `d 2`             | 删除序号为`N`的监视点                                                                                                               |

## 单步执行

```c
static int cmd_si(char *args) {
  int step = args == NULL ? 1 : atoi(args);
  if (step <= 0) {
    return -1;
  }
  cpu_exec(step);
  return 0;
}
```

## 打印寄存器

```c
static int cmd_info(char *args) {
  char subcmd = *args;
  switch (subcmd) {
  case 'r':
    isa_reg_display();
    break;
  case 'w':
    TODO();
    break;
  default:
    return -1;
  }
  return 0;
}
```

## 扫描内存

```c
static int cmd_scan(char *args) {
  char *argn = strtok(args, " ");
  char *argexpr = argn + strlen(argn) + 1;
  if (argn == NULL || argexpr == NULL) {
    return -1;
  }
  int nbyte = atoi(argn);
  if (nbyte < 0) {
    return -1;
  }
  // TODO implement expr function
  vaddr_t addr = 0x80000000;
  for (int i = 0; i < nbyte; i++) {
    vaddr_t current_addr = addr;
    printf("0x%08x: 0x%08x\n", current_addr, vaddr_read(current_addr, 4));
    current_addr += 4;
  }
  return 0;
}
```

# 表达式求值

## 词法分析

在这里，由于表达式不止数值类型一种，因此在设计 `TOKEN` 类型时多加了寄存器与变量类型，设计如下：

```c
enum {
  TK_NOTYPE = 256,
  TK_EQ,
  TK_INT,
  TK_OP,
  TK_REG,
  TK_VAR

};

static struct rule {
  const char *regex;
  int token_type;
} rules[] = {

    {" +", TK_NOTYPE},           // spaces
    {"\\t", TK_NOTYPE},          // tab
    {"\\+", TK_OP},              // plus
    {"==", TK_EQ},               // equal
    {"\\(", '('},                // '('
    {"\\)", ')'},                // ')'
    {"-", TK_OP},                // '-'
    {"\\*", TK_OP},              // '*'
    {"/", TK_OP},                // '/'
    {"[0-9]+", TK_INT},          // integer
    {"\\$[a-zA-Z0-9]+", TK_REG}, // reg
    {"[a-zA-Z_]+", TK_VAR},      // variable
};

```

由于写过编译原理，这部分还算简单，需要注意的是我们对 `rules` 的排序必须严格，因为是通过 `switch` 语句来判断的。

随后，我们对字符串流一一判断，然后存入到 `tokens` 列表中：

```c
static bool make_token(char *e) {
  int position = 0;
  int i;
  regmatch_t pmatch;

  nr_token = 0;

  while (e[position] != '\0') {
    /* Try all rules one by one. */
    for (i = 0; i < NR_REGEX; i++) {
      if (regexec(&re[i], e + position, 1, &pmatch, 0) == 0 &&
          pmatch.rm_so == 0) {
        char *substr_start = e + position;
        int substr_len = pmatch.rm_eo;

        Log("match rules[%d] = \"%s\" at position %d with len %d: %.*s", i,
            rules[i].regex, position, substr_len, substr_len, substr_start);

        position += substr_len;

        // TODO: simplify the code
        switch (rules[i].token_type) {
        case TK_NOTYPE:
          break;
        case ')':
          tokens[nr_token].type = ')';
          strncpy(tokens[nr_token].str, substr_start, substr_len);
          tokens[nr_token].str[substr_len] = '\0';
          ++nr_token;
          break;
        case '(':
          tokens[nr_token].type = '(';
          strncpy(tokens[nr_token].str, substr_start, substr_len);
          tokens[nr_token].str[substr_len] = '\0';
          ++nr_token;
          break;
        case TK_EQ:
          tokens[nr_token].type = TK_EQ;
          strncpy(tokens[nr_token].str, substr_start, substr_len);
          tokens[nr_token].str[substr_len] = '\0';
          ++nr_token;
          break;
        case TK_OP:
          tokens[nr_token].type = TK_OP;
          strncpy(tokens[nr_token].str, substr_start, substr_len);
          tokens[nr_token].str[substr_len] = '\0';
          ++nr_token;
          break;
        case TK_VAR:
          tokens[nr_token].type = TK_VAR;
          strncpy(tokens[nr_token].str, substr_start, substr_len);
          tokens[nr_token].str[substr_len] = '\0';
          ++nr_token;
          break;
        case TK_REG:
          tokens[nr_token].type = TK_REG;
          strncpy(tokens[nr_token].str, substr_start, substr_len);
          tokens[nr_token].str[substr_len] = '\0';
          ++nr_token;
          break;
        case TK_INT:
          tokens[nr_token].type = TK_INT;
          if (substr_len <= 32) {
            strncpy(tokens[nr_token].str, substr_start, substr_len);
            tokens[nr_token].str[substr_len] = '\0';
          } else {
            // TODO: handle buffer overflow
            printf("Expr %.*s is too long to handle", substr_len, substr_start);
            return false;
          }
          ++nr_token;
        default:
          break;
        }

        break;
      }
    }

    if (i == NR_REGEX) {
      printf("no match at position %d\n%s\n%*.s^\n", position, e, position, "");
      return false;
    }
  }

  return true;
}
```

> 对于超过 $32$ 位（超过 `str` 数组长度，也就是超过缓冲区大小）的内容这里没有处理，思考如何处理缓冲区溢出的情况

## 递归求值

处理完 `token` 后，我们开始进行递归求值，实际上文档写的很清楚，包括其具体框架都已给出，我们需要注意的有两个函数：

1. `check_parentheses(int p, int q, bool *success)`
2. `find_main_op(int p, int q, bool *success)`

第一个函数的行为是：消除由 `p` 到 `q` 的 `token` 所组成表达式的 **_最外层_** 括号，并判断括号序列是否合法

第二个函数的行为是：找到主操作符，其方法在文档以给出，记得重点为 **_优先级最低_**

> 在这里我们还需要实现关于负数的操作，我的做法很简单，在 `eval` 中进行判断是否当前所求值为负数（因为传入的字符流一定存在一个 `-` 符号）

因此，其具体实现为：

```c
bool check_parentheses(int p, int q) {
  if (tokens[p].type == '(' && tokens[q].type == ')') {
    int stack = 0;
    for (int i = p; i <= q; i++) {
      if (tokens[i].type == '(') {
        stack++;
      } else if (tokens[i].type == ')') {
        if (stack <= 0) {
          return false;
        }
        stack--;
      }
    }
    return stack == 0 && tokens[p].type == '(' && tokens[q].type == ')';
  }
  return false;
}

int find_main_op(int p, int q, bool *success) {
  int main_op = 3, main_op_idx = -1, stack = 0;
  for (int i = p; i <= q; i++) {
    if (tokens[i].type == TK_OP || tokens[i].type == '(' ||
        tokens[i].type == ')') {
      if (tokens[i].type == '(') {
        stack++;
        continue;
      } else if (tokens[i].type == ')') {
        if (stack <= 0) {
          return -1;
        }
        stack--;
        continue;
      }
      if (stack > 0) {
        continue;
      }
      int op_level = 0;
      if (tokens[i].str[0] == '+' || tokens[i].str[0] == '-') {
        op_level = 1;
      } else if (tokens[i].str[0] == '*' || tokens[i].str[0] == '/') {
        op_level = 2;
      } else {
        *success = false;
        printf("Invalid operator %s\n", tokens[i].str);
        return -1;
      }

      if (op_level < main_op) {
        main_op = op_level;
        main_op_idx = i;
      }
    }
  }
  if (stack) {
    success = false;
    return -1;
  }
  return main_op_idx;
}
```

此 `eval` 函数如下：

```c
word_t eval(int p, int q, bool *success) {
  if (p > q) {
    *success = false;
    return 0;
  } else if (p == q) {

    int idx = p;
    if (tokens[idx].type == TK_INT) {
      return atoi(tokens[idx].str);
    } else if (tokens[idx].type == TK_REG) {
      *success = true;
      return isa_reg_str2val(tokens[idx].str, success);
    } else if (tokens[idx].type == TK_VAR) {
      // TODO: handle variable type
      return 0;
    }

  } else if (check_parentheses(p, q) == true) {
    return eval(p + 1, q - 1, success);
  } else if (tokens[p].str[0] == '-' && p == q - 1) {
    *success = true;
    return -atoi(tokens[p + 1].str);
  } else {
    int op = find_main_op(p, q, success);
    int val1 = eval(p, op - 1, success);
    int val2 = eval(op + 1, q, success);

    if (!success) {
      return 0;
    }

    switch (tokens[op].str[0]) {
    case '+':
      return val1 + val2;
    case '-':
      return val1 - val2;
    case '*':
      return val1 * val2;
    case '/':
      if (!val2) {
        success = false;
        printf("divided by zero\n");
        return 0;
      }
      return (sword_t)val1 / (sword_t)val2;
    }
  }
  return 0;
}
```

> 成功时需要将 `success` 设置为 `true`，但感觉在最后处理是否能够成功计算时不太对，可能还需要改进
