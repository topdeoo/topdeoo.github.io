---
title: 2023 吉林省赛环境配置
description: "省赛配置流程，当做遗产留下来   "
tags:
  - NENU
date: 2023-04-19
lastmod: 2024-12-10
draft: false
---

简单划分为几个部分：

1. 网络环境配置
2. `DOMJudge` 的配置
3. 选手环境配置
4. 外榜配置
5. 打印配置
6. 气球配置
7. 上传题目（包括 `spj` 和数据）
8. 人员配置
9. 滚榜配置

一项一项说明吧。

# 网络环境配置

> 据说下次可以去一个大场地，那可能这块就用不到了

由于这次省赛比较特殊，要在四个机房打，所以需要把四个机房的局域网给连起来。一开始的设想是在三楼弄个交换机或者路由器，然后把一楼和四楼的交换机都接到这个机器上，这样配置好路由之后就可以互通了。

但最后没采用这个方案（算是变成备选方案了），更好的方法是找信息化办，让他把网段连起来，这样我们只需要按照他给的 `IP` 、网关和掩码配置每一台机器就行。

> 如果是在一个场馆内，那就可以直接配一个交换机。在一个局域网下的，就不存在上述的问题了，一个局域网下可以配253台机器，对于省赛来说应该完全够用了

所以网络环境的配置和我们关系不是很大（

> `2023/05/12` 更新

来帮 `HEU` 配置环境了，人家用的就是一个大场馆（xm T^T），遇到的问题就是需要配置静态 `ip` ，包括 `domjudge` 和 打印机 的 `ip` 地址，这两个必须固定（因为需要打在参赛手册上）

# `DOMJudge` 配置

系统默认为 `Ubuntu 20.04` 或 `Ubuntu 22.04`，自己弄个U启装吧。

分为 `DOMServer` 和 `Judgehost`

配置文档参考了 [xcpc-docs](https://github.com/cn-xcpc-tools/cn-xcpc-docs/) 但并不是完全用这个的

先给出我们的配置：

三台 `114` 机房的机子，一台为服务器(`DOMServer`)，另外两台为判题机(`Judgehost`)，机子应该都是十代i5的，16G内存

因为我们按照上述文档无法直接安装，大概是在下图这一步出了问题

![image-20230419184735145](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/image-20230419184735145.png)

文档中也没有给出解决方法，只是让你检查（谁知道怎么检查）

所以我们改用了 `docker`，下面给出 `docker` 的配置方法

> 采用 `docker` 配置的话，建议和 `docker hub` 中的文档一起看

## `docker`

首先下载 `docker`

```bash
sudo apt install docker docker-compose -y
```

下载完后应该就可以拉取镜像了，文档中说更换镜像源这一步可做可不做（当时是没做，下载的也挺快的，所以建议用 `NENUAF` 这个网络下载）

> 更新，在 `HEU` 这没拉下来，可能还是需要改镜像的，我直接把东西复制过来吧
>
> ```bash
> sudo mkdir -p /etc/docker
> sudo tee /etc/docker/daemon.json <<-'EOF'
> {
>     "registry-mirrors": [
>         "https://reg-mirror.qiniu.com",
>         "https://mirror.ccs.tencentyun.com",
>         "http://hub-mirror.c.163.com"
>     ]
> }
> EOF
> sudo systemctl daemon-reload
> sudo systemctl restart docker
> ```

## `DOMServer`

1. 拉取 `MariaDB` ，下面给出一些坑点和解释
   
   - `MYSQL_ROOT_PASSWORD` 和 `MYSQL_PASSWORD` 一定要确保后续命令中的相关项与其所对应的值一致。具体的值可以随机生成一组强度足够的密码。
   
   - MySQL 创建用户 `domjudge` ，密码对应 `[passwd2]` ，root 密码对应 `[passwd1]` （这俩都不是很重要，反正我没用过这俩）
   
   - 容器时区设置为 `Asia/Shanghai` ，容器外部数据库端口设置为 `13306` 
   
   - 设置了`--max-connections`为`1000`，保证能够顺利进行数据库连接
   
   - 设置了`--max-allowed-packet`为`1GB`，**特别注意，底层单位为`B`，而不是`KB`**。此外，貌似你设置的值大于1GB，就会按照1GB来计算。此处的值主要取决于你最大的测试数据点，一般选为**最大测试点的两倍**。
   
   - 设置了`--innodb-log-file-size`为`5GB`，单位同上。此处的值同样主要取决于你最大的测试数据点，一般选为**最大测试点的十倍**。此外，该变量与上面的不同，需要重启数据库才能更改，因此如果你**使用docker部署数据库**，请务必在启用时就做好参数的指定，所以建议设大点，我们设了5 GB。
   
   - 上面指标这些是否达标，可以在 `domjudge` 管理端的右侧部分一个 `check config` 里面查看（大概是叫这个名字）
   
   **特别注意，设置 MariaDB 密码不能有特殊字符（最好是大小写字母加数字，否则会搭建失败）。**
   
   ```bash
   sudo docker run -it --name dj-mariadb -e MYSQL_ROOT_PASSWORD=[passwd1] -e MYSQL_USER=domjudge -e CONTAINER_TIMEZONE=Asia/Shanghai -e MYSQL_PASSWORD=[passwd2] -e MYSQL_DATABASE=domjudge -p 13306:3306 mariadb --max-connections=1000 --max-allowed-packet=1GB --innodb-log-file-size=5GB
   ```

2. 拉取 `DOMServer` ，给出一些参数解释
   
   - `MYSQL_ROOT_PASSWORD` 和 `MYSQL_PASSWORD` 一定要第一条命令中的值一致。
   - 这里默认拉取的是最新版本的 `domserver` ，注意版本要和下面的 `judgehost` 一致，因此最好的方法就是直接不指定版本。
   
   ```bash
   sudo docker run --link dj-mariadb:mariadb -it -e MYSQL_HOST=mariadb -e MYSQL_USER=domjudge -e MYSQL_DATABASE=domjudge -e CONTAINER_TIMEZONE=Asia/Shanghai -e MYSQL_PASSWORD=[passwd2] -e MYSQL_ROOT_PASSWORD=[passwd1] -p 80:80 --name domserver domjudge/domserver
   ```
   
   容器建立完后，可能会跑不起来，那么我们需要：
   
   ```bash
   sudo docker ps -a
   ```
   
   找到 `DOMServer` 容器的编号，例如编号为 `ce214ewasnh1o`，那么我们输入：
   
   ```bash
   sudo docker start ce
   ```
   
   即可成功启动

3. 一开始启动失败的话，我们是看不见 `admin` 密码和 `judgehost` 的密码的，因此我们需要输入
   
   ```bash
   sudo docker exec -it domserver cat /opt/domjudge/domserver/etc/initial_admin_password.secret
   sudo docker exec -it domserver cat /opt/domjudge/domserver/etc/restapi.secret
   ```
   
   第一个是 `admin` 的初始密码（应该会很复杂，建议保存在 `txt` 文件里），第二个是下面配置 `judgehost` 需要的 `api key` ，都需要保存好。

配置完成后，本机输入 `localhost` 应该能够直接访问 `DOMServer` 的页面了（也可以登录干啥的，就是不能交题）

## `Judgehost`

在开始部署之前，需要修改 `grub` 

请编辑 `/etc/default/grub`，修改：

```bash
GRUB_CMDLINE_LINUX_DEFAULT="quiet cgroup_enable=memory swapaccount=1"
```

当然这个可能也会有问题，那么可以修改成

```bash
GRUB_CMDLINE_LINUX_DEFAULT="quiet cgroup_enable=memory swapaccount=1 systemd.unified_cgroup_hierarchy=0"
```

然后更新 `grub` 并重启

```bash
sudo update-grub
reboot
```

结束后可以开始配置 `judgehost` 

给出一些命令解释：

- 容器名为 `judgehost-0` ，判题机命名为 `judgedaemon-0` ，对应ID为 `0` ，`JUDGEDAEMON_PASSWORD` 要确保与上面获得的 `jusgehost` 的账号密码一致，容器时区设置为 `Asia/Shanghai` 。
- `DOMSERVER_BASEURL` 是服务器的 `IP` 地址，所以这个 `Judgehost` 是要等服务器确定 `IP` 后才能部署的（部署也快，不用着急），记得要在一个局域网下才能连接。

> 更新， 必须要知道 `domserver` 的 `ip` 才能配置 `judgehost`，否则会报错无法连接 `localhost` 的 80 端口，我猜测这是因为 `docker` 把  `localhost` 认为是 `docker` 自己的 `localhost` 而不是主机 `host` 的 `localhost`

```bash
sudo docker run -it --privileged -v /sys/fs/cgroup:/sys/fs/cgroup:ro --name judgehost-0 --hostname judgedaemon-0 -e DAEMON_ID=0 -e JUDGEDAEMON_PASSWORD=xxxxxxx -e DOMSERVER_BASEURL=http://192.168.1.251/ -e CONTAINER_TIMEZONE=Asia/Shanghai domjudge/judgehost
```

注意这个可能会报错，说什么无法在`/sys/fs/cgroup/cpuset` 创建目录，什么只读什么，然后说让你更改 `grub` 那个文件（上面写的那种），如果你已经改好了（指改成第二种），那随便了，这个可能是抽风了，直接

```bash
sudo docker ps -a
sudo docker start xxx
```

`xxx` 是容器编号，启动就行

如果没改那就改完然后重启，然后 `sudo docker start xxx`

启动成功后，可以在 `DOMServer` 的 `judgehost` 里面找到你配置好的东西，名字和 `--hostname` 一样。

**注意如果要开启多个的话，需要保证 `--name` 、`--hostname` 、`DAEMON_ID` 为不重复关键字。**

> 这次我们就开了五个，一台机器开三个，一台机器开两个，服务器一个都没开，因为服务器压力不能太大，怕网络请求直接把服务器干碎了（
> 
> 五个评测机完全够用了（甚至可能还多了
> 
> `ps` 我们这次只有 164 个队伍参赛

文档中说了，也不能开太多评测机，不然对服务器压力也很大，所以五个也差不多了（

然后最新版本的 `judgehost` 是支持 `python` 提交的，不需要按照文档说的去更改 `chroot` 然后安装。

最后给出判题环境各个语言编译器的版本：

- `C`: `gcc 10.2.1`
- `C++`: `g++ 10.2.1`
- `Java`: `openjdk 11.0.12`
- `python`: `python3.9`

注意这里 `C/C++` 默认开的 `O2` 优化，`C++` 没加 `-std=11`，所以应该是支持部分 `C++17` 标准的（反正肯定支持 `C++14`，也就是说可以用 `auto` 和 `for(auto s: v)` 这种遍历 `STL` 的方式）

# 选手环境配置

选手比赛用机选用的是 `ICPC 2023 WF` 的镜像，环境为：

- `C/C++`: `ICPC-Clion 2022.3`, `Code::Blocks 20.03`
- `Java`: `Eclipse 2022-12`, `ICPC-Idea Community 2022.3`
- `Python`: `Geany 1.38`, `ICPC-PyCharm Community 2022.3`

比赛用机上的 `Java` 环境是 `openjdk-17` ，和判题环境不一样，一切以判题环境为准（17 兼容 11，而且我觉得也不太会有人写 `Java`.... ）

这个环境感觉很豪华了，`2024` 年应该是不需要修改的，不用修改的U盘应该都留在老师那里了，如果到后面需要修改里面的镜像文件了（重做U启），参考网站为：[ICPC-iso](https://image.icpc.global/icpc2023/ImageBuildInstructions.html) （根据年份修改网页就行）

有了 U启 之后就是装机了，我们是一台一台装过去的，但是我看机房电脑的 `BIOS` 好像支持 `PXE` 传系统，应该是可以同传的，不需要一台一台传过去。。。

关于 `PXE` 的可以看这里 [pxe](https://www.zhihu.com/tardis/zm/art/374054171?source_id=1005)，我觉得到时候可以试试看，我们是因为时间太紧张了，机房还要上课，没时间测试这个东西……

如果不行的话，那就花一天时间装机器，装机流程如下（提前需要把每个人要装的机器的 `ip`，网关，掩码都打印出来，弄成表发下去）

> 壁纸在每个U盘里面，就是那个 `desktop.jpg` 的图片，如果有新壁纸，请提前替换这个文件

## 装机流程

分为 

1. 装 Ubuntu 系统

2. 设置桌面

3. 手动设置 IP 地址

### 装Ubuntu

**开机前先插上U盘**

开机后，一直按 `F12` 直到进入 `BIOS` 界面，回车选择 `USB HDD` 中的选项（可能会有两个分区，选择任意一个都可以）

选择后会自动进入一个黑框页面，回车进第一个 `Ubuntu` 选项，之后能看见 `ICPC WF` 的桌面。

然后会弹出一个安装界面，安装步骤如下：

1. 选择语言：中文（简体）

2. 点击右侧的 “安装Ubuntu”

3. 键盘布局：不需要修改，直接点击右下方的 “继续”

4. 更新和其他软件：选择 “最小安装”，点击下方的 “继续”

5. 安装类型：选择 “清除整个磁盘并安装Ubuntu”，点击右下方的 ”现在安装“

6. 后续一路点击 ”继续“ 即可

7. 您是谁：
   
   1. 姓名：这台电脑的 IP 地址（需要自己设置静态 IP，查表找）
   
   2. 计算机名：统一设置为 ubuntu-xxx （xxx为上述ip地址的后两段，例如ip地址为 222.27.111.3，那这里就是ubuntu-111.3）
   
   3. 用户名：ubuntu
   
   4. 密码：0
   
   5. 选择 ”自动登录“
   
   点击 ”继续“

8. 等待安装结束

安装结束后点击 ”现在重启“ 即可

### 设置桌面

重启的时候需要敲一下回车键，然后就能重启完成。

将 U 盘重新插入

打开桌面上的主目录，点击左侧的 ICPC World Final 那个U盘，里面有一张 .jpg 格式的图片，右键图片，选择 “设为壁纸” 即可

### 设置 IP 地址

1. 按 `Ctrl` + `Alt` + `T`  打开终端，输入 `sudo su` ，这一步会要求输入密码，输入 `0` 回车即可

2. 输入 `cp /media/ubuntu/ICPC\ World\ Finals\ 2023/network-manager* ~`

3. 输入 `cp /media/ubuntu/ICPC\ World\ Finals\ 2023/lib* ~`

4. 输入 `cd ~`

5. 输入 `dpkg -i lib*`

6. 输入 `dpkg -i  network-manager*`

7. 输入 `gedit /etc/network/interfaces.d/` 然后按 tab 即可（`tab` 键会自动补全，在输入上面的路径时也可以按 `tab` 进行补全），默认的路径是 `/etc/network/interfaces.d/enp1s0` 

8. 打开文件后，将文件更改为如下格式：
   
   ```yaml
   allow-hotplug enp1s0
   iface enp1s0 inet static
   address x.x.x.x
   gateway x.x.x.x
   netmask x.x.x.x
   ```

     注意上面的 `enp1s0` 是根据电脑所打开的文件名确定的，注意可能会不一样

     所有的 `x.x.x.x` 都查表看即可

4.   保存该文件后关闭

5.   在终端输入 `gedit /etc/netplan/01-network-manager-all.yaml` 

6.   打开文件后，将文件更改为如下格式：

```yaml
network:
 version: 2
 renderer: NetworkManager
 ethernets:
   enp1s0:
     dhcp4: false
```

7. 保存后关闭文件

8. 输入 `netplan apply`

9. 输入 `systemctl restart NetworkManager` 

10. 输入 `reboot` 等待重启

11. 输入 `ip a` 查看是否生效

# 外榜配置

## 内网榜单

假设现在 `DOMServer` 配置在 `IP` 为 `222.27.110.245` 上面，那么局域网内直接访问：

`http://222.27.110.245/public?static=true&contest={cid}`，其中 `{cid}` 为比赛的编号，例如 `5` ，可以直接看见 `cid` 为 `5` 的比赛的静态榜单。

> 在 `DOMServer` 中看 `cid` 可能不是 `5` 而是 `c5`……，但其实他就是 `5`

## 外网榜单

让服务器装上无线网卡，然后做内网穿刺，工具为：[nps](https://github.com/ehang-io/nps)，具体配置可以看 [nps-docs](https://github.com/ehang-io/nps/blob/master/README_zh.md) 里面的第二条(需要你有一个服务器，因为需要公网 `IP`) 

装上无线网卡会导致以太网失灵，这是因为这两个网关都默认监听 `0.0.0.0` （也就是所有网段），解决方案是更改服务器的路由：

让无线网监听 `0.0.0.0` ，让以太网的网关监听局域网的网段，例如现在局域网段为 `222.27.110.0`，把这个加进路由表，让服务器监听即可

假设现在公网 `ip` 是 `43.125.12.154`，穿刺过来的端口是 `6666`，那么静态榜单的地址就是：

`http://43.125.12.154:6666/public?static=true&contest={cid}` 

这样是不安全的，因为可能有人直接把后面那一堆去掉，然后就可以登录帮人答题了（

最好的方法是用域名隐藏这些东西，然后在服务器上用 `nginx` 进行反代，注意 `?` 后面那些都是 `GET` 请求的 `query` 参数，可能需要看看 `nginx` 文档然后再去写配置文件。

> 我们用的方法是半小时后开外榜，因为半小时后教练已经拿到题了……这个问题就没那么重要了（
> 
> 但有时间的话，最好还是解决一下，让外网通过一个域名就能直接访问（或者划两个子域名出来给两个比赛）

# 打印配置

`DOMJudge` 我没找到打印的功能，但是看文档好像可以用 `enscript` 这个打印？但我觉得这个好像只是生成pdf……，也没有直接的打印服务，所以就直接用 `flask` 先写了一个简陋能用的打印服务。

> 好像说这个代码没法控制行间距，所以导致行间距太大，一份长一点的代码就是好几页，也不好看，准备这段时间改改……（跑路了）

代码的地址：[GitHub - topdeoo/CodePrint: A simple and ungly(?) code print service for XCPC](https://github.com/topdeoo/CodePrint)

使用的过程在项目的 `README` 中都有描述，此处略过。

# 气球配置

开两个气球账号（ `DOMJudge` 自带的功能，不需要用 `ICPC Tools` 了），一个在正常的浏览器里面登录，另外一个需要浏览器开无痕浏览（为的是需要不一样的 `cookies` ）然后登陆，这样就可以实现一个账号看一个比赛了。

里面的功能还是比较全的，可以看一血，可以点击标记是否送过气球（设备都同步的），具体的用法应该在场馆都会有安排，这里不解释了。

# 上传

## 数据的上传

按照文档来就是，这个不归我们管，让出题的来弄就行，需要提醒的可能就是只能用 `winrar` 压成 `zip` 然后才能上传成功，不知道是怎么设计的（，可能是在给 `WinRAR` 打广告吧

## 学校和队伍的上传

上传的步骤：

1. `team affiliations`
2. `team categories`
3. `teams`

上传的格式可以参见文档：https://www.domjudge.org/docs/manual/8.2/import.html#importing-accounts

注意可能用的 `json` 文件，并且使用命令行上传

> 最后需要注意， `team` 的 `location` 需要自己手动输入（因为数据库是 `docker` 装的，所以导致没办法直接用语句导入，也可能可以？但是我不会……）

> 注意，队伍上传时有一个参数的队伍的分类，建议是先建立分类，再上传队伍。
> 
> 这次比赛建立的分类是：
> 
> 1. `AGroup`
> 2. `BGroup`
> 3. `StarTeam`
> 4. `WomenTeam_AGroup`
> 5. `WomenTeam_BGroup`

创建比赛时，可以选择不开放给所有队伍，开放给指定分类的队伍（可多选）

# 人员配置

> 请注意，打印服务和 `OJ` 的地址一定要说清楚，已经两次经典复现了，跑去打印的网址登录 `OJ`，然后导致这边打印出来一堆废纸（

**热身赛当天，知道怎么调IDE的，怎么调编译器的，怎么用终端的，怎么命令行编译的人一定要多一点**

热身赛应该是最忙的时候了，因为大家都在熟悉比赛环境，人太少了会忙不过来，无时无刻都会有问题……

而且问题都会问的很抽象……让人感觉都是没写过代码的人问的问题……（也可能是没用过 `Clion` ?）

正赛的时候会好很多，大家都不咋问技术问题了。

这里写一些**热身赛**时我遇到的人家问的问题：

1. `Code::Blocks` 有问题，没办法编译运行，提示没有配置 `gcc/g++` 
   
   解决方法：帮他配置 `gcc/g++` ，或者让他直接改用 `Clion` 

2. `Clion` 无法编译运行
   
   解决方法：一般来说不可能，出现这种情况一般是 `CMakeList.txt` 没写对，比如除了原来的 `main.cpp` 之外又加了一个含有 `main` 函数的 `.cpp` 文件，改一下 `CMakeList.txt` 就行；第二种情况是右上角的构建没选对，选成了 `Build All` ，应该换成 `CMakeList.txt` 里面的项目名称，一般来说都是 `ClionProject` 。

3. 有没有 `js` 编辑器
   
   解决方法：退赛

4. `Idea` 无法执行 `Java` 代码
   
   解决方法：一般来说都是因为 `jdk` 配置不对，似乎镜像中 `Idea` 配置的是 `jdk8` 还是 `11`，但环境中用的是 `17` ，针对这种情况直接新建一个项目即可。

5. `VS Code` 怎么运行 `c/cpp` 文件
   
   解决方法：换用 `Clion`；如果不愿意，那就命令行运行：
   
   ```bash
   gcc xxx.c -o xxx
   ./xxx
   ```
   
   `xxx` 为文件名，如果是 `cpp`，把 `gcc` 换成 `g++` ，文件名换掉就行。
   
   必须要提醒参赛人员的是，使用命令行的话就必须要会 `gdb` 调试，因为 `VS Code` 没有任何插件，没办法进行调试

没遇到大佬用 `Vim` 或者 `Emacs` 的，可惜了（

接下来是**正赛**的时候可能会遇到的问题：

1. `Clion` / `Idea` / `PyChram` 打不开了
   
   解决方法：按理来说这种应该是前一天删除的时候，有人把整个用户目录都删了，导致密钥没了，最好的方法是直接换台备用机（

2. 提交 `Java` 代码返回 `Info: using main from Main` 或者什么 `from Main` ，然后报了 `WA`，会认为判题系统出问题了或者怎么样
   
   解决方法：判题系统没有任何问题，注意返回的是 `Info` 而不是 `Error` ，而且报的是 `WA` 而不是 `CE` ，所以直接说系统没问题就行。

3. 判题返回 `No Output`，但是他觉得自己写了输出语句认为系统有问题
   
   解决方法：系统没问题，直接 `No Comment` 就行。

当然还看遇到其他各种各样的，我可能忘记了很多……不过一般都比较好解决，就是可能会觉得问题比较抽象……

# 滚榜配置

[ICPC-resolver](https://github.com/cn-xcpc-tools/cn-xcpc-docs/blob/master/resolver.md) 参见文档

队伍或者提交比较多的话，可能会很占内存，所以建议不要用太垃圾的机子跑（今年就卡住了两次……



