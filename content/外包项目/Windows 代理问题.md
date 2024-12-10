---
author: virgil
email: mailto:virgiling7@gmail.com
create time: 星期二, 十月 8日 2024, 2:50:46 下午
modify time: 星期二, 十月 8日 2024, 3:04:06 下午
---

# 使用 CFW 能上 github 但无法 ssh 上

ssh 的问题本质上是**系统代理**没有应用到终端上（无论是 `Windows Terminal` 还是其他软件），在安装服务后，直接开启 `Tun` 模式即可 （系统代理与 `Tun` 模式开一个就可以）

```ad-important
需要注意的是，`tun` 模式对流量不友好，工作原理本质上是直接从网络层接管了流量，因此不要一直开着，除非流量够用
```

# `Tun` 模式下可以 `ssh` 登录测试，但在 `WSL2` 中无法 `pull` 代码

```ad-note
如果你不是镜像网络，默认应当是 `NAT` 模式，那应该不存在这个困扰
```

否则解决方案参见 [wsl2 镜像网络模式与 clash tun 模式冲突的解决方案](https://www.v2ex.com/t/1000081)

由于每次开启 `tun` 可能都需要执行一次指令，一劳永逸的方法是直接把 `CFW` 的 `tun` 模式下的 `mtu` 更改为 `1500`，要么就直接换用正在更新的 `clash-verge-rev`
