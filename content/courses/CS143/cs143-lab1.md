---
title: Lab1 词法分析
description: Assignment 1 实现词法分析器
tags:
  - Stanford
  - 编译器
date: 2022-11-20
lastmod: 2024-12-15
draft: false
---

> [!note]
>
> 前言：插件 `yash` 支持的 `flex` 后缀名不包含 `.flex` 需要更改为 `.fl` ，这样我们也必须将 `Makefile` 中第 7 行以及 44 行的 `cool.flex` 更改为 `cool.fl` 。这样才能够正确的 `make lexer`
>
> 不过有一说一这个 `yash` 的语法支持确实是依托答辩，能正常编译的文件会报一大片红
>
> 更新：由于本人鸽了太久，`edX` 把我开除了= =后续都只会引用官方文档了

鉴于我在 `edx` 上学这门课，所以先放个作业首页：[Assignment #1 | Week 2: Lexical Analysis & Finite Automata | Compilers | edX](https://learning.edx.org/course/course-v1:StanfordOnline+SOE.YCSCS1+3T2020/block-v1:StanfordOnline+SOE.YCSCS1+3T2020+type@sequential+block@a412e45be94f499581b0e44aafff58f9/block-v1:StanfordOnline+SOE.YCSCS1+3T2020+type@vertical+block@344787aaf99044a7b5caa8ee5556ade9)

需要注意的是，这门课是推荐使用 `VM` / `VirtualBox` 作为实验环境的，但我比较偏爱 `docker` 一点（，实验环境的搭建可以见 [[cs143-lab0|CS143 环境搭建]]

# 实验准备

首先打开 `VS Code` ，更改实验目录为 `PA2`（默认用 `C++`，才不用 `Java`，可能后面会补上 `Java` 版本），目录如下所示：

![origin dir](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20221120171136125.png)

输入 `make` 后，会增加很多文件，包括 `test.cl` 等，实验要求在 `README` 与 [PA1.pdf (edx.org)](https://courses.edx.org/assets/courseware/v1/00e29b916fa002225f3ab7590307d69c/asset-v1:StanfordOnline+SOE.YCSCS1+3T2020+type@asset+block/PA1.pdf) 中描述的很详细

![lab env](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20221120173554864.png)

> 如果你看不明白 `Cool`，那么可以参考课程给出的文档：[cool_manual.pdf (edx.org)](https://courses.edx.org/assets/courseware/v1/27e1a38f1161e61d91c25a4b1805489b/asset-v1:StanfordOnline+SOE.YCSCS1+3T2020+type@asset+block/cool_manual.pdf)

简单来说，我们需要完成 `cool.fl` 并在 `test.cool` 上完成此词法分析器的测试。

完成后，运行命令：

```shell
make lexer
./lexer test.cl
make dotest
```

> 然而材料阅读是最折磨人的部分，这个实验设计到的材料实在有点多（还是在大家都不熟悉 `Cool` 的情况下），包括 `Cool` 的语法，`flex` 的语法，文件的依赖关系等等。

在这里我先给出一部分快速开始实验的建议

1. `Cool` 文档中 `10 Lexical Structure` 需要全部阅读
2. `Flex` 文档中的 `Patterns` 与 `Start Conditions` 需要全部阅读
3. 文件中 `cool-parse.h` 需要阅读

> 显然 `cool.fl` 是一定要读完注释的

## `Flex` 语法

显然，我们需要完成的部分只有 `cool.fl` ，`Flex` 文件包括了三个部分：

```bash
%{
Declarations
}%
Definition
%%
Rules
%%
User code
```

- 在 `User code`中，我们定义一些函数，可能在这个文件中使用，也可能在其它文件使用。（当然在这里我完全没使用）

- 在 `Definitions`中，我们包含头文件、定义全局变量、定义结构体、定义宏，做了 `User code` 区没做的事情。我们平时写的 C 文件大多数都可以分成这样的两部分，在`.flex`文件中对这两部分的处理就像在`.c`文件中一样。

- `Rules` 区，我们在这里写正则表达式。每个正则表达式后跟着一个`{}`定义的代码块，每当这个正则表达式达到匹配，就会执行这个代码块。

我们的主要工作集中在`Rules`区，设置各个正则表达式和对应的处理代码块。

具体可见 [Lexical Analysis With Flex, for Flex 2.6.2: Format (westes.github.io)](https://westes.github.io/flex/manual/Format.html#Format)

例如在官方文档中给出的例子：

```c
	/* scanner for a toy Pascal-like language */

    %{
    /* need this for the call to atof() below */
    #include <math.h>
    `

    DIGIT    [0-9]
    ID       [a-z][a-z0-9]*

    %%

    {DIGIT}+    {
                printf( "An integer: %s (%d)\n", yytext,
                        atoi( yytext ) );
                }
	%%

    int main( int argc, char **argv )
        {
        ++argv, --argc;  /* skip over program name */
        if ( argc > 0 )
                yyin = fopen( argv[0], "r" );
        else
                yyin = stdin;

        yylex();
        }

```

# 实验过程

## 实验目标

做到像官方给的词法分析器 `~/cool/bin/reflexer` 这样：

![image-20230228201318709](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230228201318709.png)

下面我按照我的实验步骤开始讲述。

最开始我们想到的匹配应该是关键词匹配，因为你只需要枚举然后匹配就行，但注意 `cool` 文档中提到：

![image-20230228202942898](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230228202942898.png)

1. `Cool` 中关键词大小写不敏感（除了 `true` 和 `false` ）
2. `true` 和 `false` 的敏感也只是体现在最开始那个字母而已

那么，我们给出如下的定义：

```c
DARROW =>
CLASS (?i:class)
ELSE (?i:else)
FI (?i:fi)
IF (?i:if)
IN (?i:in)
INHERITS (?i:inherits)
LET (?i:let)
LOOP (?i:loop)
POOL (?i:pool)
THEN (?i:then)
WHILE (?i:while)
CASE (?i:case)
ESAC (?i:esac)
OF (?i:of)
NEW (?i:new)
ISVOID (?i:isvoid)
ASSIGN <-
NOT (?i:not)
LE  <=
```

注意到这里我的正则表达，这是 `Flex` 文档中存在的表达：

![image-20230302162624431](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230302162624431.png)

这样就不需要写类似：`[Cc][Ll][aA][Ss][Ss]` 这种正则了。

这样，我们就可以在 `Rule` 区写出我们应该做的事情：

```c
{DARROW}    { return (DARROW); }
{CLASS} { return (CLASS); }
{ELSE}  { return (ELSE); }
{FI}    { return (FI); }
{IF}    {return (IF); }
{IN}    {return (IN); }
{INHERITS}  { return (INHERITS); }
{LET}   { return (LET); }
{LOOP}  { return (LOOP); }
{POOL}  { return (POOL); }
{THEN}  { return (THEN); }
{WHILE} { return (WHILE); }
{CASE}  { return (CASE); }
{ESAC}  { return (ESAC); }
{OF}    { return (OF); }
{NEW}   { return (NEW); }
{ISVOID}    { return (ISVOID); }
{ASSIGN}    { return (ASSIGN); }
{NOT}   { return (NOT); }
{LE}    { return (LE); }
```

注意这里我们 `return ` 的值都是定义在 `cool-parse.h` 中的（这在 `handout` 中有提示，让我们跟随这个文件中拥有的定义来完成词法分析，也就是说我们返回的 `Token` 都是属于这些类型的， 当然忽略 `LET_STMT` ）

但在这里没有给出 `true` 和 `false` 的匹配规则，这是因为：

![image-20230302163447222](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230302163447222.png)

我们需要在 `yylval.boolean` 中给出拿到的结果：

```c
t(?i:rue)   {
    yylval.boolean = true;
    return (BOOL_CONST);
}

f(?i:lase)  {
    yylval.boolean = false;
    return (BOOL_CONST);
}
```

第二步，我们将对类名，变量名以及数字做正则匹配：

![image-20230302195044597](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230302195044597.png)

注意要求为：

- `TYPEID` 要求首字母大写，后续由数字字母下划线组成
- `OBJECTID` 要求首字母小写，后续由数字字母下划线组成

> 这里最重要的一点：不要写成 `[aA-zZ0-9]` 这样会把一些不需要匹配的符号也加载进去

- 数字的正则是平凡的

```c
[A-Z][a-zA-Z0-9_]*  {
    yylval.symbol = idtable.add_string(yytext);
    return (TYPEID);
}

[a-z][a-zA-Z0-9_]*  {
    yylval.symbol = idtable.add_string(yytext);
    return (OBJECTID);
}

[0-9]+  {
    yylval.symbol = inttable.add_string(yytext);
    return (INT_CONST);
}
```

随后，匹配空白符与换行符（注意这里换行符需要单独处理，因为我们需要记录行号）：

![image-20230302195421151](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230302195421151.png)

```c
[ \t\r\f\v] {}

\n    {
    ++curr_lineno;
}
```

记得在 `[ \t\r\f\v]` 中需要加入空格以匹配空格符。

## Condition 的应用

最后就只剩下最复杂的注释与字符常量的匹配了。

幸运的是你并不需要自己从零开始写这部分内容，在 `Flex` 的官网中给出了 `C` 系语言注释与字符常量的匹配模板。

1. 注释

   对于注释而言，`Cool` 分为单行注释与多行注释，其中单行注释是 trivial 的：

   ```c
   --.*$   {}
   ```

   然而对于多行注释，要求为：

   ![image-20230302195742040](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230302195742040.png)

   如果注释中遇到了 `EOF` 那么需要报错，如果在注释外遇到了 `*)` 那么也需要报错（这部分我认为应该是如果多行注释符号不成对，那么报错）

   那么在这里，我们需要用到 `Condition`，模仿官网上的写法：

   ```c
   %x comment starter

   %%

       int comment_caller;

   "(*"    {
       comment_caller = INITIAL;
       BEGIN(comment);
   }

   <starter>"(*"   {
       comment_caller = starter;
       BEGIN(comment);
   }

   <comment>[^*\n]*    {}
   <comment>\n {++curr_lineno;}
   <comment>"*"+")"    {
       BEGIN(comment_caller);
   }

   <comment><<EOF>>    {
       yylval.error_msg = "EOF in comment";
       BEGIN(comment_caller);
       return (ERROR);
   }

   "*)"    {
       yylval.error_msg = "Unmatched *)";
       return (ERROR);
   }

   %%
   ```

2. 字符常量的处理

   与上面类似，但在这部分我们的任务多了一些：

   1. 我们需要检测字符常量的长度是否超出最大长度限制 `MAX_STR_CONST`

   2. 我们需要对换行做出限制：

      ​ ![image-20230302200317352](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230302200317352.png)

   3. 字符常量中不能出现 `EOF` ，否则报错

   4. 对特殊字符进行单独处理

      ![image-20230302200524131](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230302200524131.png)

   5. 最终返回的字符串不能带 `""`

   6. 若遇到 `null` 需要报错（这点我似乎好像没实现）

   简而言之，和 `C` 系字符常量限制类似，那么我们可以直接修改官网中的示范：

   ```c
   %x str

   %%

   \"  {
       string_buf_ptr = string_buf;
       BEGIN(str);
   }

   <str>\" {
       BEGIN(INITIAL);
       *string_buf_ptr = '\0';
       if(string_buf_ptr - string_buf > MAX_STR_CONST){
           yylval.error_msg = "String constant too long";
           return (ERROR);
       }
       else {
           yylval.symbol = stringtable.add_string(string_buf);
           return (STR_CONST);
       }
   }

   <str>\n {
       yylval.error_msg = "Unterminated string constant";
       ++curr_lineno;
       BEGIN(INITIAL);
       return (ERROR);
   }

   <str>\\[0-7]{1,3}  {
       int result;
       (void) sscanf(yytext + 1, "%o", &result);
       if(result > 0xff){
           yylval.error_msg = "Unterminated string constant";
           BEGIN(INITIAL);
           return (ERROR);
       }
       *string_buf_ptr++ = result;
   }

   <str>\\[0-9]+   {
       yylval.error_msg = "Unterminated string constant";
       BEGIN(INITIAL);
       return (ERROR);
   }

   <str>\\n  *string_buf_ptr++ = '\n';
   <str>\\t  *string_buf_ptr++ = '\t';
   <str>\\r  *string_buf_ptr++ = '\r';
   <str>\\b  *string_buf_ptr++ = '\b';
   <str>\\f  *string_buf_ptr++ = '\f';

   <str>\\(.|\n)  *string_buf_ptr++ = yytext[1];

   <str>[^\\\n\"]+ {
       char *yptr = yytext;

       while ( *yptr )
               *string_buf_ptr++ = *yptr++;
   }


   %%
   ```

最后，我们还有非法字符与一般不知道什么字符（例如`()` ）的匹配没有实现，通读 `Cool` 文档后（实际上只需要阅读关键字和那个图）就知道有几个字符是不会在 `Cool` 中出现的：

`[]'>`，其他的都是正常的字符，直接返回即可：

```c
[\[\]\'>] {
    yylval.error_msg = yytext;
    return (ERROR);
}


.   {
    return yytext[0];
}
```

但这样还没完成 `Cool` 的 `Lexer` 。

我们还需要对上文中的规则进行重组，以达到更好的匹配效率（甚至不重新排列可能会出错）：

```c
%%

    int comment_caller;

[\[\]\'>] {
    yylval.error_msg = yytext;
    return (ERROR);
}

--.*$   {}

"(*"    {
    comment_caller = INITIAL;
    BEGIN(comment);
}

<starter>"(*"   {
    comment_caller = starter;
    BEGIN(comment);
}

<comment>[^*\n]*    {}
<comment>\n {++curr_lineno;}
<comment>"*"+")"    {
    BEGIN(comment_caller);
}

<comment><<EOF>>    {
    yylval.error_msg = "EOF in comment";
    BEGIN(comment_caller);
    return (ERROR);
}

"*)"    {
    yylval.error_msg = "Unmatched *)";
    return (ERROR);
}

[ \t\r\f\v] {}

\n    {
    ++curr_lineno;
}

{DARROW}    { return (DARROW); }
{CLASS} { return (CLASS); }
{ELSE}  { return (ELSE); }
{FI}    { return (FI); }
{IF}    {return (IF); }
{IN}    {return (IN); }
{INHERITS}  { return (INHERITS); }
{LET}   { return (LET); }
{LOOP}  { return (LOOP); }
{POOL}  { return (POOL); }
{THEN}  { return (THEN); }
{WHILE} { return (WHILE); }
{CASE}  { return (CASE); }
{ESAC}  { return (ESAC); }
{OF}    { return (OF); }
{NEW}   { return (NEW); }
{ISVOID}    { return (ISVOID); }
{ASSIGN}    { return (ASSIGN); }
{NOT}   { return (NOT); }
{LE}    { return (LE); }

t(?i:rue)   {
    yylval.boolean = true;
    return (BOOL_CONST);
}

f(?i:lase)  {
    yylval.boolean = false;
    return (BOOL_CONST);
}

[A-Z][a-zA-Z0-9_]*  {
    yylval.symbol = idtable.add_string(yytext);
    return (TYPEID);
}

[a-z][a-zA-Z0-9_]*  {
    yylval.symbol = idtable.add_string(yytext);
    return (OBJECTID);
}

[0-9]+  {
    yylval.symbol = inttable.add_string(yytext);
    return (INT_CONST);
}

\"  {
    string_buf_ptr = string_buf;
    BEGIN(str);
}

<str>\" {
    BEGIN(INITIAL);
    *string_buf_ptr = '\0';
    if(string_buf_ptr - string_buf > MAX_STR_CONST){
        yylval.error_msg = "String constant too long";
        return (ERROR);
    }
    else {
        yylval.symbol = stringtable.add_string(string_buf);
        return (STR_CONST);
    }
}

<str>\n {
    yylval.error_msg = "Unterminated string constant";
    ++curr_lineno;
    BEGIN(INITIAL);
    return (ERROR);
}

<str>\\[0-7]{1,3}  {
    int result;
    (void) sscanf(yytext + 1, "%o", &result);
    if(result > 0xff){
        yylval.error_msg = "Unterminated string constant";
        BEGIN(INITIAL);
        return (ERROR);
    }
    *string_buf_ptr++ = result;
}

<str>\\[0-9]+   {
    yylval.error_msg = "Unterminated string constant";
    BEGIN(INITIAL);
    return (ERROR);
}

<str>\\n  *string_buf_ptr++ = '\n';
<str>\\t  *string_buf_ptr++ = '\t';
<str>\\r  *string_buf_ptr++ = '\r';
<str>\\b  *string_buf_ptr++ = '\b';
<str>\\f  *string_buf_ptr++ = '\f';

<str>\\(.|\n)  *string_buf_ptr++ = yytext[1];

<str>[^\\\n\"]+ {
    char *yptr = yytext;

    while ( *yptr )
            *string_buf_ptr++ = *yptr++;
}

.   {
    return yytext[0];
}

%%
```

# 最终结果

我们与标准的词法分析器做对比：

```bash
../../bin/reflexer test.cl > stdout.txt
cd -
make lexer
./lexer test.cl > myans.txt
diff myans.txt stdout.txt
```

如下所示：

![image-20230302201459843](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230302201459843.png)

这样就完成了实验（但是不知道在后续过程中会不会出错，因为一个 `case` 不能测试完所有的 `bug`）

# 实验总结

一个做之前不知道怎么动手但是做完之后觉得真 tm 简单的实验（bushi，甚至最难的地方，人家官网都给你把饭嚼碎了，等着你去吃 = =

感觉比较考验的不是代码能力，纯粹是英文水平

> 做之前觉得写这个博客一定很困难，做完之后觉得这有什么好写的，不好评价
