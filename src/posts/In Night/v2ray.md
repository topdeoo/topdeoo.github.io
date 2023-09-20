---
title: v2raya安装与使用
math: true
date: 2023-06-12 17:23:04
tag:
 - v2ray
category:
- 我的很多零零碎碎
---
> `v2raya` 安装与使用
<!--more-->



文档给出 `v2rayA` 的安装与配置过程

# 安装

## Windows

下载此连接中的 `v2rayN-With-Core.zip` 后，解压。

```card
title: v2rayN
link: https://github.com/2dust/v2rayN/releases/tag/6.23
```

目录如下所示：

![image-20230630220913461](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230630220913461.png)

运行 `v2rayN.exe` 即可





## MacOS(OSX) / Linux

> 确保安装 `HomeBrew` ，若未安装，可以参考此 [网站](https://brew.sh/index_zh-cn)

打开终端，输入

```bash
brew tap v2raya/v2raya
brew install v2raya/v2raya/v2raya
```

即可安装 `v2raya` 

运行：

```bash
brew services start v2raya
```

启动服务

# 使用

在浏览器中输入网址 [http//localhost:2017](http//localhost:2017) 或 [http://127.0.0.1:2017](http://127.0.0.1:2017) 

## 登录

初次进入需要注册帐号密码：

![image-20230612170424578](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230612170424578.png)

帐号密码可以设置比较好记的，最好不要忘记，如果忘记密码，可以参考 [Windows重置密码](https://v2raya.org/docs/prologue/installation/windows/#windows-%E4%B8%8B%E9%87%8D%E7%BD%AE%E5%AF%86%E7%A0%81) 或在 `MacOS` 下在终端在输入 `sudo v2raya --reset-password` 来重置密码

## 导入节点

![image-20230612171109524](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230612171109524.png)

点击此处的 **创建** （不是**导入**），会出现以下界面，按照下图中的内容填写即可

![image-20230612171511885](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230612171511885.png)

## 启动

完成后，只需要按下图顺序点击，即可启动

![image-20230612171748028](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230612171748028.png)

> 在访问国内网站时如果开着 `vpn` 可能会导致速度变慢，因此在访问国内网站时可以选择关掉，直接点击左上角的 **正在运行** （移上去会变成 **关闭**）即可

# 卸载

如果是 `Windows` 的话，直接在卸载程序里卸载即可

如果是 `MacOS/Linux` 的话，运行

```bash
brew uninstall v2raya
```

