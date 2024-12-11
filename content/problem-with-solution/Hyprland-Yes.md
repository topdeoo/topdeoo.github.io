---
title: Hyprland Yes!
description: 如何从 X11 转向 Wayland 下的配置
tags:
  - Linux
  - Manjaro
date: 2024-01-27
lastmod: 2024-12-11
draft: false
---

# 更新

> [!NOTE]
>
> 本文的前篇是 [[Manjaro-Linux]]，一些软件（或者 AUR 助手）之类的下载也可以参考上一篇文章

由于不太想使用 `Manajro` 了，想尝试 `NixOS` 所以换了一个系统，但用了一个礼拜发现 `NixOS` 的安装到使用都有点燃烧硬盘寿命的意思，所以最后还是变成了 `Arch-based`，但使用的是 `ArcoLinux` 这个小众的版本（

以下是我的新桌面系统（不用 neofetch 了，因为作者回老家种地去了）：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202405251728640.png)

这里记录一下安装过程中遇到的一些问题（未来也会继续更新，目前遇到的 bug 并不算多）

1. `xwayland` 与 `wayland` 的剪切板不互通，这个似乎是 `hyprland` 的问题，在 `github` 上回退版本即可，或者不安装 `hyprland-git` 也可以，然后我们也需要安装一个 `X11` 下的剪贴板，可以是 `xclip`，我这里安装的是 `wl-clipboard-x11`
2. 鼠标指针的主题在 `gtk` 上是正常的，但在 `hyprland` 中又没有被设置，这里只需要在 `~/.config/hypr/hyprland.conf` 中设置一下环境变量即可：`env = XCUCSOR_THEME,xxxx`

> [!WARNING]
>
> NENU 换了 ATrust 作为 VPN 工具了，下面的方法已经寄啦（悲

> [!INFO]
> 这里是 NENU 专场，在 Linux 下如何访问学校的服务器，首先，我们需要保证自己有两个账号密码：
>
> 1. 服务器的账号密码
> 2. 管理服务器的 VPN 的账号密码
>    例如，服务器账号密码为 ：virgil， virgil
>    但连接学校 vpn 的账号为 xxx_virgil, virgil（不是统一认证账号）
>    那么，我们运行如下命令：`docker run --rm --device /dev/net/tun --cap-add NET_ADMIN -ti -p 127.0.0.1:7080:1080 -p 127.0.0.1:8888:8888 -e EC_VER=7.6.3 -e CLI_OPTS="-d https://vpn.nenu.edu.cn -u info_wangstu -p dThqPx7Fs3FGA" hagb/docker-easyconnect:cli &`
>    即可在后台开启一个 `easyconnect`，然后，我们使用 `ssh` 如下即可成功连接

```bash title="设置 easyconnect 连接校园 vpn"
ssh -o ProxyCommand='ncat --proxy-type socks5 --proxy 127.0.0.1:7080 virgil@<host-ip>
```

# Intro

关于 `KDE`，`GNOME`，`X11`， `Wayland` 的区别和联系请看： [GNOME，Xorg，X Window，X Server，Wayland 是什么关系](https://www.zhihu.com/question/503270852)

关于为什么突然想从 `X11` 转向 `Wayland`，这个过程较为曲折，概括来说就是，想使用一个渲染更快，架构更新，并且是平铺式的桌面

在网上也看了许多配置完成的例子，比如 `dwm`，`i3wm` 等等平铺式窗口管理器，但最后选择的是 `wayland` 协议下的 `hyprland` 窗口管理器，然后用一些插件来完善桌面

> 当然本质上还是在玩赛博暖暖

下面是我的成果

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202402230022942.png)

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202402230023153.png)

`Hyprland` 的动画效果做的太过丝滑，配上一些手势控制后，可以达到 `Mac` 一样的效果，这是我在 `KDE` 下从没做到过的（因为那个手势控制的软件不够灵敏）

并且，使用平铺桌面之后，甚至可以直接抛弃鼠标了（`vim` 党大胜利），虽然写代码还没有完全转向 `neovim`，但在不用鼠标这一点上已经相去不远了。

> 注意，`wayland` 还不够成熟，许多软件在 `wayland` 协议下没法工作，比如 `electron` 这种框架的，就必须运行在 `xwayland` 转化协议下才能够工作

# 配置

## 一些偷懒方法

这里推荐一个脚本，可以快速完成配置，然后进行一些微调，对于不想折腾的来说这是个不错的选择

- [ML4W](https://gitlab.com/stephan-raabe/dotfiles)
- [名人堂](https://hyprland.org/hall_of_fame/)
- 其他人的一些参考 `dotfiles`

## 我的配置

在 Hyprland 的 [Wiki](https://wiki.hyprland.org/) 中，官方给出了很多新手提示，并且也给出了一些软件的建议。

你可以在 [hypr-dotfiles](https://github.com/topdeoo/hyprland-dotfiles) 找到我的配置，我使用的配置为：

- 应用程序启动器：`rofi` ，主题是网上搜刮找到的
- 顶部导航栏：`waybar`，主题搜刮来的，但也自己写了一些配置，但注意的是 `waybar` 其实和其他功能联动不强，你也可以使用 `ewww` 这个软件（似乎是 `Rust` 写的，速度应该有保障）
- 终端模拟器：`kitty`，主题是网上搜刮的，字体本人更喜欢使用 `Monaco`，你也可以选择自己喜欢的字体，例如 `Maple`, `Menlo`（大概是这个名字），但请注意一定要选择 `Nerd Font`，为了后续的美化。而终端模拟器你也可以选择 `Alacritty`，虽然是 `Rust` 写的，但似乎在动画和速度上不如 `Kitty`，如果你有心思去解决一些 `BUG` 的话，也可以选择 `Wezterm`，因为这个模拟器还不支持 `Hyprland`
- 文件管理器：`Nautilus` 对于文件管理器的选择其实有很多，例如 `KDE` 的 `Dolphin`，可以选择一个自己喜欢的。当然，我们也可以使用之前 `KDE` 下的主题，只需要下载 `nwg-looking` 然后选择之前下载的主题即可。
  - 例如文件夹主题：![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202402230002634.png)
- 剪切板管理：`copyq`，如果你对脚本钟爱的话，可以自己写一个脚本然后在 `hyprland/hyprland.conf` 里面用快捷键执行（我感觉 `copyq` 比 `cliphist` 好用很多
- 剪切板： `wl-clipboard`，只有这一个选择
- 截图工具：`hyprland-interactive-screenshot`，并没有和网上大部分一样用脚本来解决，只不过这个需要定时清理以下截屏的文件夹。
- 锁屏：`swaylock`，简单好用
- 壁纸： `swagbg`，神写的壁纸软件（纯静态，如果想要花里胡哨的动态效果，`swww` 是个不错的选择），你也可以安装 `waypaper` 来随时更换壁纸而不需要每次都去写配置文件。
- 消息通知（弹窗）: `mako` 简单好用，虽然主题也是白嫖网上的
- 终端美化与 `shell`: `starship` & `fish`，原本使用的是 `zsh`，但在某一天我的 `zsh` 再也无法自动读取 `.zshrc` 的内容了，于是就换成了更智能的 `fish`
- 录屏相关： `obs` & `pipewire` & `wireplumbe` 这些都在 `Wiki` 中说过了
- 手势软件：`fusuma`，极品，让我的 `Linux` 直接拥有 `Mac` 的触控板体验（略显夸张但真的很好用）
- 网络管理： `NetworkManager`，好用不解释
- 输入法：`fcitx5`，最常用的输入法，请务必选择。

字体：中文字体强烈推荐 霞鹜文楷，英文字体推荐 `Monaco` 因为是等宽字体看起来舒服很多。

## 遇到的问题

> [!warning]
> 
> 应该遇到了很多问题，但由于时间跨度太大，导致我写这篇文章的时候已经记不起太多了，后面一定及时补充

### Picgo 上传问题

这个问题主要是因为 `picgo` 的脚本获取剪切板不太对，解决这个问题首先我们需要保证使用的是 `picgo` 而不是 `picgo-core`，然后，在下图中选择 “使用内置剪切板上传” 即可解决问题(当然，需要保证使用 `copyq` 这个管理软件)

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/202402230021751.png)

### 连接不上新网络（反复要求输入密码）

一般遇到这个问题，可能是因为密钥环缺少管理工具，首先下载一个密钥环管理软件 `seahorse` 就可以解决。

如果这样也无法解决的话，那可能只能使用 `iwctl` 进行 `tui` 登陆。

### 蓝牙无法可视化连接

说是无法可视化连接，其实只是打开的窗口只能看见设备的 `MAC` 码（？），无法找到设备的名称，所以很多时候只能用命令行登录
