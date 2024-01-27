---
title: My Formatter for C/C++
date: 2023-10-20 11:48:20
---
# Which Compiler

使用 `clang/clang++` 进行编译，应为出错提示良好可读。

# Which Formatter

使用 `clang-format` 与 `clang-tidy` 进行格式化，前端使用 `clangd`

# How to use

在一个结构如下的项目中：

```bash
.
├── build
├── CMakeLists.txt
├── contrib
├── Dockerfile
├── experiments
├── include
├── Readme.md
├── src
```

我们添加两个文件：

1. `.clangd`
2. `.clang-format`

在 `.clangd` 中加入：

```yml
CompileFlags: 
  Add: [-xc++, -Wall, -std=c++2a, -Werror]
  Compiler: clang++               
```

也可以加入自己需要的部分，具体的参数可以查看官网 [clangd](https://clangd.llvm.org/config)

在 `.clang-format` 中加入：

```yaml
---
Language: Cpp
BasedOnStyle: Google
IndentWidth: 4
AccessModifierOffset: -4
ColumnLimit: 104
SpacesInParentheses: true
AlwaysBreakAfterReturnType: None
AlwaysBreakAfterDefinitionReturnType: None
SpaceBeforeCpp11BracedList: true
BreakBeforeBinaryOperators: All
Cpp11BracedListStyle: true
AllowShortBlocksOnASingleLine: Always
BreakBeforeBraces: Custom
BraceWrapping:
  AfterClass: false
  AfterControlStatement: false
  AfterFunction: false
  AfterStruct: false
  AfterEnum: false
  SplitEmptyFunction: false
  SplitEmptyRecord: false
  SplitEmptyNamespace: false
PackConstructorInitializers: NextLine
...
```

:::tip
请保持相同的代码风格
:::

# 如何下载 clangd 等工具

:::tip
只记录在 `Linux` 上的安装过程
:::

## Ubuntu

由于在 `Ubuntu` 上存在很多版本的 `clangd`，但我建议只需要下载 `clangd` （不带版本号），否则需要自己配置路径，比较麻烦。

```bash
sudo apt-get install -y clang clangd clang-formay clang-tidy
```

版本一般而言都默认为 `14`

然后在编辑器内安装 `clangd` 的插件即可，默认都使用 `VS Code` 

如果使用 `vim/neovim/emacs` 那么可以直接去论坛或 `github` 上找插件

## ArchLinux

使用 `AUR` 下载即可：

```bash
yay -S clangd clang clang-format clang-tidy
```

默认下载最新版本

# Compiler Flags

请开启至少三个选项：

```bash
-Wall -Werror -fsanitize=address
```

保证你的代码能够通过编译检查

# Clang tidy

`.clang-tidy` 模板文件如下：

```yaml
Checks:
   '*,-altera-*,-llvmlibc-*,-google-build-using-namespace,-modernize-use-trailing-return-type,-readability-implicit-bool-conversion,-*-non-private-member-variables-in-classes,-modernize-use-nodiscard,-*-magic-numbers,-readability-identifier-length,-concurrency-mt-unsafe,-llvm-header-guard,-fuchsia-default-arguments-calls,-fuchsia-default-arguments-declarations,-fuchsia-overloaded-operator,-android-cloexec-accept'

WarningsAsErrors:
   '*'

CheckOptions:
   hicpp-signed-bitwise.IgnorePositiveIntegerLiterals: 'true
```

你可以选择自己的 `.clang-tidy`。