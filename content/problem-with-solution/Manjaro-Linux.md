---
title: Manjaro 的安装与配置
description: 由于在 Windows 下开WSL和IDE导致电脑内存已经吃不消了，所以我直接把电脑系统刷成了 Linux （彻底疯狂了），这里记录一下我的配置过程
tags:
  - Linux
  - Manjaro
date: 2023-05-12
lastmod: 2024-12-11
draft: false
---
> [!info]
> 
> 2024.04 更新，由于已经进化到 `KDE6` 了，本文中的一些美化已经过时，请谨慎食用
>
> 2023.10 更新微信安装及其配置， wps 安装及其配置， 美化主题配置 请看 [[#更新]]

放一张图展示一下我的成果

![desktop](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/MyDesktop-2023-05-12.png)

> 桌面是我最爱的拿不拿术曲！

# 电脑配置

`Honor Magicbook 14 2023`

价格：4999

# 踩坑经历

安装 `Manjaro` 前还试了另外几个发行版：

1. `Arch Linux`

2. `Deepin V23 Alpha`

`Ubuntu` 就不算了，已经用懒了，完全不想折腾 `Debian` 系的东西了= =

对于 `Arch Linux`，我的安装步骤都没有任何问题，但是在登录本机的 `root` 帐号时，会出现终端一直输入 `^@` 这个符号的情况，导致我无法登录，所以这个就直接寄了

对于 `Deepin`，安装是没啥问题，特别顺利，完全是傻瓜式安装，然而它实在是太卡了，桌面动画卡成 `PPT` 的样子，和上古时代 `C` 盘被占满的 `Win 7` 一样

所以到后来就直接选择基于 `Arch` 的 `Manjaro`

# 安装

这里我只针对我的电脑进行讲解，因为是刚出的电脑，所以 `Linux` 在驱动支持上做的比较差，如果要装 `Linux` 的话，那就需要放弃一些功能，包括但不限于：

1. 指纹解锁

2. 荣耀官方的电池管理系统 `OS Turbo 2.0`

3. 键盘莫名其妙一直输入 `^@`

4. 屏幕亮度会被莫名其妙的调节 （已解决）

可能还有很多坑我还没踩到……

## 制作 `U` 启

> 注意这一步都是在 `Windows` 系统下完成的

在官网上下载 iso 镜像： https://manjaro.org/download/

选择 `PLASMA DESKTOP` （会好看一些？个人感觉），选择 `Minimal` 下载

下载之后，使用刻录工具，例如我使用的 `Rufus` 将此 iso 文件刻录到 `u` 盘中，成为一个 `u` 启 （注意选择分区模式为 `GPT` 而非 `MBR`）

# 安装系统

插入 U 盘，开机，疯狂按 `F12` 进入 `BIOS` ，在这里设置几样内容：

1. 语言设置为简体中文

2. 将启动顺序通过 `F5, F6` 调整顺序，将 `USB` 放在最上面

3. 关闭 `安全模式`，否则将无法启动

4. 将指纹解锁功能关闭

最后按 `F10` 即可保存退出，然后就会进入 `Manjaro` 的引导页面，进入后跟着安装向导一步一步来即可（甚至都不用自己分区，完全是傻瓜式装机）

# 配置系统

安装结束后，就可以顺利进入系统了，第一次进入系统一般会弹出这样的提示框：

![2023-05-12_01-15.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/2023-05-12_01-15.png)

(可能右下角的语言会是英文，但没关系，可以设置为中文)

在这里点击 `Application` 必须要选的内容如下：

![2023-05-12_01-21.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/2023-05-12_01-21.png)

这样会省去一些配置的时间（比如烦人的中文输入法），然后点击 `UPDATE SYSTEM` 即可

接下来是 `AUR` 的安装（这也是为什么要使用 `Arch` 系的原因）

> [!note]
>
> 在下载包时如果不是对版本更新有强要求，那么最好下载带有 `-bin` 后缀的包

但在安装之前，我们需要更新一下镜像源：

打开 `Konsole`，运行命令：

```bash
sudo pacman-mirrors -i -c China -m rank
```

然后选择前三个镜像源即可，不用全选上（似乎全选上会有负面影响）

然后运行

```bash
sudo pacman -Syyu
```

更新即可（记住这个命令，以后每天早上开机后都要滚一滚）

然后我们就可以开始配置 `AUR` 了，这里我们选择 `yay`

首先我们下载 `git` 和 `base-devel`

```bash
sudo pacman -S base-devel
sudo pacman -S git
```

随后：

```bash
cd /opt
sudo git clone https://aur.archlinux.org/yay
sudo chown -R <username>:users ./yay
cd yay/
GOPROXY=https://goproxy.cn makepkg -si
```

请将 `<username>` 替换为你的用户名

等待安装结束即可，此后我们安装包只需要：

```bash
yay -S xxxx
```

即可安装（更新其实也可以用 `yay`）

## 常用软件安装

### 工作类

- [x] `OBS`
- [x] `QQ`
- [x] `WPS`
- [x] 坚果云
- [x] 谷歌浏览器
- [x] `v2ray` 与 `v2raya`
- [x] `Wechat`

给出每一样的安装步骤：

```bash
yay -S obs-studio
yay -S deepin-wine-qq
yay -S wps-office wps-office-mui-zh-cn ttf-wps-fonts
yay -S nutstore
yay -S google-chrome
```

微信的安装其实也可以，但是在我这里会出现输入框的中文变成方框的问题，还没发现修改的方法，有佬知道怎么改的话请教教我（

对于 `v2ray` ，安装过程也比较简单：

```bash
 sudo pacman -S v2ray
```

安装 `v2ray` 内核，然后运行 `sudo systemctl enbale v2ray.service`

随后安装 `v2raya`

```bash
yay -S v2raya
```

即可

在浏览器中访问 `http://locahost:2017` 即可配置 `v2raya`（第一次登录需要配置帐号密码），后续对节点的设置与 `Windows` 下 `v2rayN` 的设置一致。

### 开发类

- [x] `JetBrains` 全家桶
- [x] `VS Code`
- [x] `Typora`
- [x] `Obsidian` ✅ 2023-10-05
- [x] `LunarVim`

```bash
yay -S clion pycharm-professional intellij-idea-ultimate-edition goland
yay -S typora
yay -S obsidian
yay -S  visual-studio-code-bin
```

针对后面两种 `LunarVim` 和 `Emacs`，我觉得应该也没什么佬用，我在这里就不写了（

### 游戏类

只下载了 `Steam`，但是这个需要用 `discover` 这个软件，所以还需要先

```bash
yay -S discover
```

然后还要装一个存储库：

```bash
sudo pacman -S flatpak
sudo flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
```

完成后，就可以打开 `discover` ，然后在里面找到 `steam` 了

# 桌面美化

> 更新：由于我更换了桌面环境，最新的美化可以参考 [[Hyprland-Yes|Hyperland美化]]

## `Konsole` 美化

### 外观

1. 配色方案的新建与修改

   ![image-20230512160505624](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230512160505624.png)

   这里我采用的 `shell` 为 `zsh`（也是 `Konsole` 默认的 `Shell` ）

   在外观中，选择配色方案，这里我选择的为黑底白字，然后在右侧选择编辑：

   ![image-20230512160708622](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230512160708622.png)

   在编辑界面可以选择：

   1. 背景图片
   2. 模糊背景
   3. 透明度

   等，按照自己喜好选择即可

   字体推荐默认的 `Hack` 字体（感觉还挺好看的，如果想要选择其他字体的话，可以自己去 `AUR` 下载，然后在这里选择即可）

### `zsh` 美化

这里不用 `oh-my-zsh` 那些东西，只用原生的 `zsh` + `plugin`

1. 首先删除 `～/.zshrc`， 然后重新打开 `zsh` 进行一些配置

2. 安装插件

```bash
sudo pacman -S zsh-autosuggestions zsh-syntax-highlighting zsh-theme-powerlevel10k zsh-completions
```

3. 启用插件，打开 `~/.zshrc`，加入以下代码

```bash
source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
source /usr/share/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh
source /usr/share/zsh-theme-powerlevel10k/powerlevel10k.zsh-theme
```

4. 重启 `Konsole` ，即可进入 `powerlevel10k` 的配置界面，按照引导配置即可

最终效果：

![image-20230512161304340](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230512161304340.png)

## 主题

直接给出我的配置，可以在 `KDE Store` 中下载（甚至都可以直接在 `AUR` 中下载）

![image-20230512161437730](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230512161437730.png)

![image-20230512161450550](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230512161450550.png)

![image-20230512161503482](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230512161503482.png)

![image-20230512161519675](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230512161519675.png)

![image-20230512161540236](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230512161540236.png)

![image-20230512161557288](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230512161557288.png)

![image-20230512161610704](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230512161610704.png)

## 页面

用了一些有趣的插件

1. `Latte Dock`
2. `Panon`
3. `Awesome Widget`

大概就用了这三个，直接在 `AUR` 中安装的，安装之后 `Latte Dock` 需要用应用程序来启动，另外两个都是挂件类型，直接添加即可

具体的配置过程就不写了（因为感觉这个和审美关系比较大，我也没啥审美……）

# 最后的最后

安装 `neofetch` 和 `lolcat` （必不可少

```bash
sudo pacman -S neofetch lolcat
```

然后就可以愉快的秀 `Terminal` 了

# 更新

## QQ

在 `AUR` 上可以找到 `linuxqq` 这个包，安装即可，这个 `qq` 能够获得和 `windows` 上的 `qq` 相同的体验（大赞腾讯的 qq 部门）

```shell
yay -S linuxqq
```

## Wechat

> [!important]
>
> 现在可以直接下载 `wechat-beta-bwarp` 这个包，似乎效果比原先的微信体验好很多

在 `AUR` 官网上搜索 com.qq.weixin.deepin，然后 yay 下载即可

```shell
yay -S com.qq.weixin.deepin
```

会遇到的问题：

1. 输入框中大字只会出现方框不显示文字
2. 缩放不对，显示的字体太小
3. 输入法太小，看不清字

前两个的解决方法都在网站上有，复制过来就是：

Q:高分屏缩放支持
A:执行 `WINEPREFIX=~/.deepinwine/Deepin-WeChat deepin-wine6-stable winecfg`，在显示标签下调整 DPI,100%缩放为 96dpi，依次类推 200%缩放 192dpi

Q:输入框无法显示输入字符，只显示口
A:可以下载安装宋体字体文件`simsun.ttc`，重启微信即可正常显示

> [!quote]
>
> 关于 Linux 如何安装字体，可以直接 Google

关于输入法的问题：

可以用可视化界面解决，打开输入法的配置（一般输入法默认为 `Fcitx5`，在 `manjaro` 下可以直接用 `Manjaro-Hello` 来安装，不需要自己配置）：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231005161619.png)

按照次序点击选择即可，字号选择自己看着舒服的就行。

## WPS 配置

1. 显示配置
2. WPS Word 无法导出 pdf 的配置

显示的时候字号会变小，而且无法调整，我们在启动的社会加入参数即可。

选择一个 wps app，右键，点击 “编辑应用程序”，配置如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231005161932.png)
在环境变量处加上 `QT_FONT_DPI=xxx` 即可（xxx 为你需要缩放的 DPI 值，一般为 100, 120, 144）

WPS Word 无法导出 pdf：

此问题为缺少环境，其导出依赖于 `libtiff5.so.5`，下载安装即可：

```bash
yay -S libtiff5
```

## Obsidian

`Obsidian` 中还是存在很多问题的，但我觉得大部分都是插件之间冲突的原因，比如 `style setting` 和 `codeBlock customizer` 设置之后会导致很多插件的即时预览出现毛病……

不过这里找的问题是查看关系图谱时直接黑了，什么图都没有，一般报错是报 `js` 的问题（甚至还是警告），据了解应该是 `mesa` 版本的问题，降版本可以解决（然而 `Manjaro` 清理了缓存之后就没办法降级了……能降级的[archlinuxfr](http://repo.archlinux.fr/)直接停止维护了，如下：
![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231005162845.png)

但论坛上给出了另外一种解决方法：

`rm -rf .config/obsidian/GPUCache/`

然后重启 `obsidian` 即可。

## 美化

感觉是最无聊的一个板块（？

重新用的主题和一些配置如下：

主题：`Lavanda-Sea-Light`
应用程序风格：`kvantum`
视觉风格：`Lavanda-Sea-Dark`
窗口装饰元素：`Breezemite dark`
图标： `ePapirus`
光标：`Volantes Cursors`
欢迎界面：`Arch Simple Blue`

目前界面如下：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20231005163435.png)
