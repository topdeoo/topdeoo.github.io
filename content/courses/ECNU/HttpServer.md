---
title: 2020 计网项目作业
description: HttpServer
tags:
  - ECNU
  - Network
date: 2022-06-23
lastmod: 2024-12-10
draft: false
---

> 本项目源代码已上传至Github: [topdeoo/Computer-Net-Project (github.com)](https://github.com/topdeoo/Computer-Net-Project)

# 题目一： 实现一个简易的Web服务器

> 要求为：
>
> 1. 请使用`ServerSocket`和`Socket`进行代码实现
> 2. 请使用多线程接管连接
> 3. 在浏览器中输入`localhost:8081/index.html`能显示自己的学号信息（请自行编写`index.html`) 
> 4. 在浏览器中输入`localhost:8081`下其他无效路径，浏览器显示`404 not found`
> 5. 在浏览器中输入`localhost:8081/shutdown`能使服务器关闭

首先我们需要明确，一个多线程服务器应该完成什么工作：

1. 我们有一个主线程，不妨命名为 `main` （与 `main` 函数同名），这个线程负责运行一个`ServerSocket`，来监听是否有客户端连接

2. 当有一个连接时，也就是 `ServerSocket` 能够 `accept` 时，我们新建一个线程来完成

   1. 解析报文
   2. 处理请求
   3. 回复报文

   这三件事后，这个线程即可销毁。

## 监听端口，确定连接

受到第二题的启发，多线程，并不意味需要频繁的创建与销毁线程，我们也可以通过线程池，来提高服务器的效率。

> 使用线程池的原因是，在最初的版本中我们都是新建一个线程来处理这个连接，处理完后线程就会销毁，但这样显然是浪费的，通过线程池，我们可以回收这部分被销毁的线程，在需要使用的时候继续使用，这样就能够解决频繁创建线程与销毁线程所浪费的大量时间。

于是，我们就可以直接写出函数的主体：

```java
public class Server {

    private static final int PORT = 8081;

    public static void main( String[] args ) throws IOException {
        ExecutorService ThreadPool = Executors.newFixedThreadPool(200); //开辟一个固定大小的线程池
        ServerSocket serverSocket = new ServerSocket(PORT);
        while (true){
            Socket socket = serverSocket.accept(); //监听固定端口是否有客户端连接
            System.out.println("Success"); //检测到连接则print成功
            ThreadPool.execute(new Handler(socket)); //使用线程池调用一个线程处理连接
        }
    }

}
```

这里，我们可以简单的写出 `Handler` 的大体框架如下：

```java
class Handler implements Runnable{

    private final Socket socket;

    Handler(Socket socket){

        this.socket = socket;
    }

    @Override
    public void run() {
        try{
            // 解析，处理，回复报文
        }
        catch (IOException e){
            e.printStackTrace();
        }
    }
}
```

这样，我们就完成了第一件事。

下面，我们集中精力来完成第二件事：解析，处理，回复报文



## 解析请求报文，作出响应

首先我们知道，`http` 的请求报文分为三个部分：

1. 请求行
2. 请求头
3. 请求体

如下图所示

![请求报文](https://s2.loli.net/2022/06/23/P5Yy3X9SMweNxD2.webp)

这里，我们基于 `Java` 面向对象的想法，将 `Http` 报文封装为一个类，如下`UML`图所示：

![HTTPHeader](https://s2.loli.net/2022/06/23/DwSEoUhzpGrPq4V.png)

在 `RequestHeader` 中，我们分隔出了：

- 请求行中的 `method` , `url` , `version` 三条字段
- 请求头中的各类信息 `headMap` ， 并着重提取了 `Host` , `Content-Type` 与 `Content-Length` 三条字段
- 请求体中的信息 `data`

 `ResponseHeader` 继承了 `RequestHeader` 的大多数字段，并可根据 `RequestHeader` 来创建对象，在 `ResponseHeader` 中，我们增加了：

- 状态码与状态码含义 `code`, `code_meaning`
- 服务器名称 `server`

这样，通过这两个类，我们便可以很好的解析并构造出一份 `HTTP` 报文。



### 解析报文

首先，我们需要从客户端接收报文，于是，通过 `Handler` 中的 `String getMsg(BufferedReader)` 方法来完成：

```java
private @NotNull String getMsg( @NotNull BufferedReader br) throws IOException {
        StringBuilder ret = new StringBuilder(); //创建一个可变的字符序列
        char[] chars = new char[Utils.SIZE];
        do{
            br.read(chars);
            ret.append(chars);
            Arrays.fill(chars, '\0'); //clear chars
        } while (br.ready());
        return ret.toString();
    }
```

于是，我们便能得到请求报文的字符串版本，从而进行下一步的处理。

我们通过 `Utils` 中的 `RequestHeader requestParseString(String)` 函数来完成解析请求报文的任务。

算法步骤如下：

1. 实例化一个 `RequestHeader` 对象 `requestHeader`，并将其返回
2. 通过 `CRLF` 定位请求行，并将其分割为 `method`, `url`, `version` 三部分，将其值赋给 `requestHeader` 中的这三个成员
3. 通过 `CRLF` 将报文字符串分割，并将其循环存入哈希表中；在循环时，通过正则表达式匹配，获得特定字段的值并赋给 `requestHeader` 中相对应的成员
4. 在循环时，维护一个变量 `split` 作为报文头与报文体的分割位置，由于报文头与报文体之间存在空行，于是当循环读到空行时便可跳出循环
5. 将 `split` 之后的所有字符视为报文体，并将其存入 `requestHeader` 中的 `data` 中

代码如下：

```java
public static @NotNull RequestHeader requestParseString( @NotNull String temp){

        assert temp.contains(CRLF);

        RequestHeader requestHeader = new RequestHeader();

        String firstLine = temp.substring(0, temp.indexOf(CRLF)); //提取出请求行
        String[] parts = firstLine.split(" ");

        assert parts.length == 3;

        requestHeader.setMethod(parts[0]);
        requestHeader.setUrl(parts[1]);
        requestHeader.setVersion(parts[2]); //分隔出请求方法，请求url，版本号

        parts = temp.split(CRLF); //分隔请求报文的每一行

        int split = 0; //为标志报文体开始位置
        for(int i = 0; i < parts.length; i++){ //分隔每一请求报文首部行
            if(parts[i].equals("")){ //为空则读至报文头和报文体的分界
                split += 2; //跳过\r\n
                break;
            }
            split += (2 + parts[i].length()); //增加\r\n与首部行长度
            int idx = parts[i].indexOf(":");
            if(idx == -1)
                continue; //去除第一行
            if(Utils.HOST.matcher(parts[i]).matches())
                requestHeader.setHost(parts[i].substring(idx + 2)); //匹配首部名为host的值

            else if(Utils.CONTENT_LENGTH.matcher(parts[i]).matches())
                requestHeader.setContent_length(Integer.parseInt(parts[i].substring(idx + 2)));

            else if(Utils.CONTENT_TYPE.matcher(parts[i]).matches())
                requestHeader.setContent_type(parts[i].substring(idx + 2));
            else {
                String K = parts[i].substring(0 ,idx); //key 为首部名
                String V = "";
                if (idx + 1 < parts[i].length())
                    V = parts[i].substring(idx + 1); //value为首部值
                requestHeader.putHeadMap(K ,V);
            }
        }
        requestHeader.setData(temp.substring(split)); //读取请求报文体内容

        return requestHeader;
    }
```

这样，我们便可以拿到一个通过报文构造的 `RequestHeader` 对象。

### 对请求作出响应



首先我们需要知道，响应报文的结构是怎样的

![回复报文](https://s2.loli.net/2022/06/23/BkFOzWKl93PvwDQ.webp)

于是我们需要确定这个服务器应当返回多少种状态，每个状态的含义是什么

我们假定，服务器只会返回 4 种状态，分别为：

```java
STATUS_CODE_200("OK", 200),
STATUS_CODE_404("Not Found", 404),
STATUS_CODE_501("Not Implemented", 501),
STATUS_CODE_500 ("Internal Server Error",500);
```

这里的处理，我们可以运用 `Java` 中的异常信息来进行编写：

1. 通过请求报文，生成对应的响应报文
2. 首先处理 `200` 的情况
3. 当出现文件不存在时，那么我们处理 `404` 的情况
4. 当捕捉到其他异常时，那么我们处理 `500` 的情况

但对于异常处理，这里做的处理是，返回对应状态码的报文头，并返回对应的页面，如`404.html`

那么我们显然不需要在每一个异常状态中都写一遍重复的代码，所以这里可以统一使用 `handleError(int)` 来处理异常状态。

于是，`Handler` 便可以这样编写：

```java
class Handler implements Runnable{

    private final Socket socket;

    private static RequestHeader requestHeader;

    private static ResponseHeader responseHeader;

    Handler(Socket socket){

        this.socket = socket;
    }

    private static void handle501( Socket socket ){
        try{
            handleError(socket, 501);
        }
        catch (Exception e){
            e.printStackTrace();
        }
    }

    private static void handle500( Socket socket ) {
        try{
            handleError(socket, 500);
        }
        catch (Exception e){
            e.printStackTrace();
        }
    }

    private static void handle404( Socket socket ) {
        try{
            handleError(socket, 404);
        }
        catch (Exception e){
            e.printStackTrace();
        }
    }

    private static void handleError( @NotNull Socket socket ,int code ) throws IOException {
        // 具体处理
    }

    private static void handle200( Socket socket ) throws IOException {
        // 具体实现
    }

    private @NotNull String getMsg( @NotNull BufferedReader br) throws IOException {
        StringBuilder ret = new StringBuilder(); 
        char[] chars = new char[Utils.SIZE];
        do{
            br.read(chars);
            ret.append(chars);
            Arrays.fill(chars, '\0'); 
        } while (br.ready());
        return ret.toString();
    }



    @Override
    public void run() {
        try{

            InputStream is = socket.getInputStream();
            BufferedReader br = new BufferedReader(new InputStreamReader(is));
            String temp = getMsg(br); //将报文转为字符串

            requestHeader = Utils.requestParseString(temp); //解析报文
            responseHeader = new ResponseHeader(requestHeader); //创建报文头

            try {
                Handler.handle200(socket); //请求成功
            }
            catch (FileNotFoundException e){
                Handler.handle404(socket); //not found
            }
            catch (Exception e){
                Handler.handle500(socket); //服务器错误
            }
            finally {
                socket.close();
            }
        }
        catch (IOException e){
            e.printStackTrace();
        }
    }
}

```

随后，我们进入 `handle200` 做进一步处理：

​	获取请求方法 `method`， 对请求方法做 `swicth`， 将其引导到对应的方法中去

- 若为 `GET`
  1. 获取请求的 `url`
  2. 若 `url` 为 `shutdown`， 则直接关闭服务器，否则继续运行
  3. 在文件系统中查询文件名与 `url` 相同的文件，并读取存储到 `byte[]` 之中
  4. 通过 `Utils` 中的 `writeResponse(ResponseHeader, int, int, String)` 方法，写出对应的响应头
  5. 通过 `socket` 将响应报文传送回客户端
- 若为 `HEAD`， 则大致与 `GET` 相同，但不需要传送报文体
- 若为 `POST`
  1. 通过 `Utils` 中的 `writeResponse(ResponseHeader, int)` 方法，写出对应的响应头
  2. 将 `responseHeader` 中的 `Content-Length` 与 `Content-Type` 属性清空，表示不传送任何报文体
  3. 从 `requestHeader` 中的 `data` 中获取客户端传送的数据
  4. 将 `data` 写入数据库中后，将响应头传送回客户端
- 若为 `PUT` (这里的 `PUT` 方法只实现了将 `Markdown` 转化为 `Html` 文件)
  1. 通过 `Utils` 中的 `writeResponse(ResponseHeader, int)` 方法，写出对应的响应头
  2. 取出 `requestHeader` 中的 `data` 并通过 `Utils` 中的 `mdToHtml(String)` 方法将其转化为 `Html` 的字节数组
  3. 将 `responseHeader` 中的 `Content-Length` 设置为上一步中得到的数组的长度
  4. 将报文头与报文体通过 `socket` 传送回客户端
- 若为其他，则跳转至 `handle501(Socket)`

其中 `writeResponse` 方法代码如下：

```java
public static void writeResponse( @NotNull ResponseHeader header,int code,int length,String url){
    header.setCode(code); //设置状态码及含义
    header.setContent_length(length); //设置长度
    header.setContent_type(Utils.queryFileType(url)); //查询并设置类型
}

public static void writeResponse( @NotNull ResponseHeader header,int code){

    header.setCode(code);
}
```

而报文头的编写，是通过重写其 `toString()` 方法来完成的：

```java
@Override
public String toString() {
    StringBuilder ret = new StringBuilder(); //构造回复报文

    ret.append(String.format("%s %d %s\r\n", getVersion(), code, code_meaning));
    ret.append(String.format("Server: %s\r\n", getServer()));
    ret.append(String.format("Content-Type: %s\r\n", getContent_type()));
    ret.append(String.format("Content-Length: %d\r\n", getContent_length()));
    ret.append("Date:").append(new Date()).append("\r\n\r\n");

    return ret.toString();
}
```

`handle200` 具体代码如下：

```java
private static void handle200( Socket socket ) throws IOException {

        String method = requestHeader.getMethod(); //获取请求方法

        switch (method){
            case "GET":
                String url = requestHeader.getUrl(); //获取请求的url

                if(url.equals(Utils.EXIT)) //if shutdown
                    System.exit(-1); //程序退出，关闭服务器

                byte[] responseBody = Utils.NIOReadFile(url);

                Utils.writeResponse(responseHeader, 200, responseBody.length, url);
                socket.getOutputStream().write(responseHeader.toString().getBytes(StandardCharsets.UTF_8));
                socket.getOutputStream().write(responseBody);
                break;
            case "HEAD":
                Utils.writeResponse(responseHeader, 200);
                socket.getOutputStream().write(responseHeader.toString().getBytes(StandardCharsets.UTF_8));
                break;
            case "POST":
                Utils.writeResponse(responseHeader, 200);
                responseHeader.setContent_type("");
                responseHeader.setContent_length(0);
                String data = requestHeader.getData(); //获取post的内容
                Utils.NIOWriteFile("db/data.txt", data, requestHeader.getContent_length()); 
                //将data写入数据库db（伪）
                socket.getOutputStream().write(responseHeader.toString().getBytes(StandardCharsets.UTF_8));
                break;
                case "PUT":
                Utils.writeResponse(responseHeader, 200);
                responseHeader.setContent_type(Utils.queryFileType(".html"));
                responseBody = Utils.mdToHtml(responseHeader.getData()).getBytes(StandardCharsets.UTF_8);
                //实现将md文件转换成html（读取请求报文体内容，转换成html并转换成字节数组）
                responseHeader.setContent_length(responseBody.length); //获取字节数组长度
                socket.getOutputStream().write(responseHeader.toString().getBytes(StandardCharsets.UTF_8));
                socket.getOutputStream().write(responseBody);
                break;
            default:
                handle501(socket); //未实现
        }

    }
```

当我们捕捉到异常时，便需要进入 `handleError(Socket, int)` 进行异常处理:

```java
private static void handleError( @NotNull Socket socket ,int code ) throws IOException {

    String filename = "web/error/" + code + ".html"; //确定响应页面
    byte[] responseBody = Utils.NIOReadFile(filename); //获取响应报文数据
    Utils.writeResponse(responseHeader, code, responseBody.length, filename); //生成响应报文头
    socket.getOutputStream().write(responseHeader.toString().getBytes(StandardCharsets.UTF_8));
    socket.getOutputStream().write(responseBody); //回复响应报文头及数据

}
```

至此，一个简易的HTTP Server就完成了，其UML图如下：

![Server](https://s2.loli.net/2022/06/23/F79y52gIpdbA18M.png)



## 测试结果

#### 浏览器：

- GET index.html页面：

![Test index.html](https://s2.loli.net/2022/06/23/PNbY7otmnrjC46H.png)

- GET 其他页面：

![Test 404](https://s2.loli.net/2022/06/23/GJAwHyvu5mP4LSD.png)

- GET shutdown：

![Test shutdown](https://s2.loli.net/2022/06/23/O5RqWcjuVCyYd6x.png)

![Test shutdown](https://s2.loli.net/2022/06/23/o6PXW8EpCylwOcL.png)



### postman：

- GET index.html页面：

![Test index.html](https://s2.loli.net/2022/06/23/XeOHGmIKa13JVAb.png)

- GET 其他页面：

![Test 404](https://s2.loli.net/2022/06/21/bNkTiWIvSjn9fUP.png)

- HEAD index.html页面：

![Test index.html](https://s2.loli.net/2022/06/23/vT57HfEhyqViLWR.png)

- POST index.html页面：

![Post test](https://s2.loli.net/2022/06/23/ve8YHjcBKEawQkA.png)

![Post test](https://s2.loli.net/2022/06/23/syaYcAdZvn5URCk.png)

- PUT md文件

![Put test](https://s2.loli.net/2022/06/23/cdZRnybI8XH2vgC.png)

- GET shutdown：

![Test shutdown](https://s2.loli.net/2022/06/23/Naq38DdRGIJytHo.png)

![Test shutdown](https://s2.loli.net/2022/06/23/o6PXW8EpCylwOcL.png)

### jmter压测：

![1000并发数](https://s2.loli.net/2022/06/23/iDJK9CO7dtXTqYI.png)

![Result](https://s2.loli.net/2022/06/23/549XQ6FjWEpVNdS.png)

![10000并发数](https://s2.loli.net/2022/06/23/UogqiDlNvACuRSV.png)

![Result](https://s2.loli.net/2022/06/23/uTVlFMEqcJwBRAn.png)

观察异常的结果，我们可以发现，其异常原因并非是 `Connection refused`，事实上，都返回了确定响应报文，但状态码被设置为 `500`，如图所示：

![Error reason](https://s2.loli.net/2022/06/23/lxqAQgCrwNPM6oe.png)

事实上出现这样的结果是因为顺势并发量太大，而导致有部分线程并未运行到 `handle200()` 就被输出了，因此我们在代码中检查了这一情况，并将其状态码设置为 `500` 。

------

# 题目二：实现一个简易的多线程代理服务器

> 第二题中源服务器与第一题相同，因此在这里略过

首先明确，题目中要求完成的代理是什么。

1. 当你的代理服务器从一个浏览器接收到对某个对象的HTTP请求时，它生成对相同对象的一个新的HTTP请求并向初始服务器发送。
2. 当该代理从初始服务器接收到具有该对象的HTTP相应时，它生成一个包括该对象的新的HTTP响应，并发送给该客户。
3. 这个代理将是多线程的，使其在相同能够处理多个请求。

理解是需要完成的代理是一个类似于中转站的服务器，它把请求报文和响应报文原封不动的传送给服务器与客户端，如下图所示：

![Proxy](https://s2.loli.net/2022/05/30/ELisekZnKlPoI9u.png)

但本质上代理依然是一个服务器，于是参照先前的写法，我们可以如下设计此代理服务器：

![Proxy UML](https://s2.loli.net/2022/06/23/cLoVXFdCf5xbIeE.png)

代码如下：

```java
import org.jetbrains.annotations.Contract;
import org.jetbrains.annotations.NotNull;

import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;

public class Proxy { //类服务器

    private static final int PORT = 8080;

    public static void main( String[] args ) throws IOException {

        ServerSocket serverSocket = new ServerSocket(PORT);

        ExecutorService HandlerPool = Executors.newFixedThreadPool(100);

        while (true){

            try {
                Socket socket = serverSocket.accept();

                HandlerPool.execute(new ProxyHandler(socket));

            }
            catch (IOException e){
                e.printStackTrace();
            }
        }

    }

}

class ProxyHandler implements Runnable{

    private final Socket client;

    ProxyHandler( Socket socket){
        this.client = socket;
    }

    @Override
    public void run(){

        try {
            // 具体工作
        }
        catch (Exception e) {
            e.printStackTrace();
        }


    }
}

```

代理相对于客户端而言，应当是一台服务器，而对于源服务器而言，应该是一个客户端。

于是，代理的工作流程可以描述为：

1. 监听代理端口，当有客户端连接时，线程池分配线程处理连接
2. 从客户端接受报文
3. 检查报文结构（获取客户端的`Host`信息）并生成一份新报文
4. 通过 `Host` 信息得到服务器的`IP` 与 端口，建立新 `Socket` 与服务器取得连接
5. 将新生成的报文发送给服务器
6. 从服务器接受响应报文并生成一份新报文，通过客户端的 `Socket` 传送给客户端

前三步就是第一题中服务器的内容，很容易就能写出如下代码：

```java
private @NotNull String getMsg( @NotNull BufferedReader reader) throws IOException {
    StringBuilder ret = new StringBuilder();
    do{
        char[] chars = new char[Utils.SIZE];
        reader.read(chars);
        ret.append(chars);
    } while (reader.ready());
    return ret.toString(); 
}

@Override
public void run(){

    try {

        String temp = getMsg(new BufferedReader(new InputStreamReader(client.getInputStream()))); 
        RequestHeader requestHeader = Utils.requestParseString(temp);
        String host = requestHeader.getHost(); 
        int idx = host.indexOf(":");
        if(idx != -1) {
            port = Integer.parseInt(host.substring(idx + 1)); //截取(localhost:8081)目的端口号，若无则为80
            host = host.substring(0, idx);
            String[] parts = requestHeader.getUrl().split("/"); // http://localhost:8081/index.html
            requestHeader.setUrl(parts[parts.length - 1]); //截出所需url部分（即index.html）
        }
        // To Server
        client.close();

    }
    catch (Exception e) {
        e.printStackTrace();
    }


}
```

这里需要注意

- 代理服务器读到的 `url` 与服务器读到的 `url` 是不相同的，例如，客户端请求 `http://localhost:8081/index.html`，代理得到的 `url` 是 `http://localhost:8081/index.html` ，而服务器读到的是 `/index.html`，因此，我们需要通过一些操作截取出 `index.html` 部分，并包装成新的 `url`。
- `Host`字段可能会出现 `localhost:8081` 这种域名+端口的形式，于是我们需要将端口与域名分割，而若不存在这种情况的话，那么我们默认端口为80

接下来，我们就可以建立新的 `Socket` 向源服务器建立连接，发送消息并接受服务器的响应报文：

```java
@Override
public void run(){

    try {

        String temp = getMsg(new BufferedReader(new InputStreamReader(client.getInputStream()))); 
        RequestHeader requestHeader = Utils.requestParseString(temp); 
        String host = requestHeader.getHost(); 
        int idx = host.indexOf(":");
        if(idx != -1) {
            port = Integer.parseInt(host.substring(idx + 1)); //截取(localhost:8081)目的端口号，若无则为80
            host = host.substring(0, idx);
            String[] parts = requestHeader.getUrl().split("/"); // http://localhost:8081/index.html
            requestHeader.setUrl(parts[parts.length - 1]); //截出所需url部分（即index.html）
        }
        Socket server = new Socket(host, port);
        server.getOutputStream().write(requestHeader.toString().getBytes(StandardCharsets.UTF_8));

        temp = getMsg(new BufferedReader(new InputStreamReader(server.getInputStream()))); //获取服务器响应报文
        ResponseHeader responseHeader = Utils.responseParseString(temp);
        
        // 向客户端发送数据

        server.close();
        client.close();

    }
    catch (Exception e) {
        e.printStackTrace();
    }


}
```

但在向客户端发送数据前，我们需要对服务器传送来的报文体（可能没有）进行处理，这是因为，由于传送的 `String` 的 `byte[]` 可能在末尾会出现大量的 `0` 也就是会出现大量的不应该出现的 `NULL`，于是我们需要对传送来的报文体进行一些处理：

```java
@Contract(pure = true)
private byte @NotNull [] getData( @NotNull String data,int length){ //去除报文内容中的null
        byte[] ret = new byte[length]; //开一个等同报文体长度的字节数组
        byte[] bytes = data.getBytes(StandardCharsets.UTF_8); //将捕获的报文体内容重新转为字节格式
        System.arraycopy(bytes ,0 ,ret ,0 ,length); //将报文体内容复制到新开的数组中
        return ret;
}
```

通过调用这个方法，我们就可以将后续的几步实现了：

```java
@Override
public void run(){

    try {

        String temp = getMsg(new BufferedReader(new InputStreamReader(client.getInputStream())));
        RequestHeader requestHeader = Utils.requestParseString(temp); 
        String host = requestHeader.getHost(); 
        int idx = host.indexOf(":");
        if(idx != -1) {
            port = Integer.parseInt(host.substring(idx + 1)); //截取(localhost:8081)目的端口号，若无则为80
            host = host.substring(0, idx);
            String[] parts = requestHeader.getUrl().split("/"); // http://localhost:8081/index.html
            requestHeader.setUrl(parts[parts.length - 1]); //截出所需url部分（即index.html）
        }
        Socket server = new Socket(host, port);
        server.getOutputStream().write(requestHeader.toString().getBytes(StandardCharsets.UTF_8));

        temp = getMsg(new BufferedReader(new InputStreamReader(server.getInputStream()))); //获取服务器响应报文
        ResponseHeader responseHeader = Utils.responseParseString(temp);
        OutputStream os = client.getOutputStream();
        os.write(responseHeader.toString().getBytes(StandardCharsets.UTF_8));

        byte[] responseBody = getData(responseHeader.getData(), responseHeader.getContent_length());
        os.write(responseBody);

        server.close();
        client.close();

    }
    catch (Exception e) {
        e.printStackTrace();
    }

}
```

整体架构为：

![Server And Proxy](https://s2.loli.net/2022/06/20/XaLknIyts5U2NKJ.png)

## 测试结果

浏览器与postman的测试结果同题1图

### jmter压测：

![1000并发数](https://s2.loli.net/2022/06/23/iDJK9CO7dtXTqYI.png)

![Result](https://s2.loli.net/2022/06/23/eRwgz2M4riVotsX.png)

![10000并发数](https://s2.loli.net/2022/06/21/YiSfDKOyaTkbHoq.png)

![Result](https://s2.loli.net/2022/06/21/Q2fK8h1EtcIubxA.png)

我们继续查看测试异常的结果，可以发现，其异常原因依然是因为服务器返回 `500` ，而非 `Connection refused`:

![Error Reason](https://s2.loli.net/2022/06/23/VM6pw9ktYWU7rNh.png)

> 注：如何测试代理服务器
>
> 1. 浏览器（以msedge为例）
>
>    1. 打开浏览器的设置页面（右上角三点，设置）
>
>    2. 在左侧搜索栏搜索“代理”，点击右侧的最后一个
>
>       ![操作步骤](https://s2.loli.net/2022/06/01/JKFrfQDoTjMkdcY.png)
>
>    3. 打开后，手动开启代理，设置端口号为代理服务器的端口号，这里为8080
>
>       ![代理设置](https://s2.loli.net/2022/06/01/a12X3f5lD6LeSbm.png)
>
>    4. 测试完需关闭代理，这里的代理是电脑的代理，如果不关闭会导致电脑的所有网络连接都是通过这个代理实现的
>
> 2. postman
>
>    如图：
>
>    ![打开设置](https://s2.loli.net/2022/06/01/tWnlLqbuSX3ROKI.png)
>
>    ![代理设置](https://s2.loli.net/2022/06/01/lKHCTN8YIsrSteM.png)

------

# 附加：NIO服务器与NIO代理服务器

## NIO服务器

### NIO简介

1. **ByteBuffer**：

   NIO的传输基本单位，任何`String`类型都必须转化为`ByteBuffer`来传输

   `String` 与 `ByteBuffer` 的转换为：

   ```java
   String str = StandardCharsets.UTF_8.decode(byteBuffer).toString();
   
   ByteBuffer bb = StandardCharsets.UTF_8.encode(str);
   // or
   ByteBuffer bb2 = ByteBuffer.wrap(str.getBytes(StandardCharsets.UTF_8));
   ```

   关于 `ByteBuffer` 内部的实现这里不着重讲，需要注意的是，我们每次往 `ByteBuffer` 中读完数据，若想 `ByteBuffer` 能够向其他地方写数据，我们需要将其 `flip `一下，来翻转读写模式，例如

   ```java
   channel.read(byteBuffer); //读完数据
   
   byteBuffer.flip();
   
   String str = StandardCharsets.UTF_8.decode(byteBuffer).toString();
   ```

2. **Channel**:

   NIO中，读写不再使用`OutputStream`这种流传输，转为使用传输 `ByteBuffer` 来传输数据，可以用 

   ```java
   ByteBuffer bb = ByteBuffer.alloc(1024); //申请大小为1024字节的缓冲区
   
   channel.read(bb);
   
   bb.flip();
   
   channel.write(bb);    
   ```

   这样的方式，来向管道中读写数据，我们可以将此管道视为`BIO`（传统IO）中的 `Socket.getInputStream` 与 `Socket.getOutputStream`。

   但是需要注意的，这里的 `channel` 支持双向读写，也就是说我们不需要区分`Input`与`Output`了。

3. **Selector**

   这是NIO中最重要的部分，我们可以通过下图来解释`Selector`可以用来做什么。

   ![Selector](https://s2.loli.net/2022/06/01/yQY4wKC5xt7h2AG.png)

   我们可以发现，一个 `Selector` 可以管理多个 `Channel`。

   不如把 `Selector` 视为一个服务器，下面的 `Channel` 视为客户端，那么这个图就会很清晰，而在NIO，这种想法恰好可以实现：

   我们运行一个线程，在这个线程中创建一个 `Selector` ，让这个线程去监听一个固定的端口，每当有客户端尝试连接这个端口时，我们就接受这个连接，并开启一个 `Channel` ，注册到这个 `Selector` 下面，让 `Selector` 来管理这个 `Channel`。

   代码如下：

   ```java
   try(ServerSocketChannel server = ServerSocketChannel.open()) { //打开服务器的套接字通道
               Thread.currentThread().setName("master"); //启动一个主线程
               server.bind(new InetSocketAddress(PORT)); //监听固定端口
               server.configureBlocking(false); //将该通道设置为非阻塞（不设置则仍为BIO）
   
               Selector master = Selector.open(); //创建一个Selector
               server.register(master, SelectionKey.OP_ACCEPT);
               //将当前这个 server 注册到 Selector 下面, 后面的OP_ACCEPT表示这个server只管接受连接，其他什么都不做
   
               Handler[] handlers = new Handler[4];
               for (int i = 0 ; i< handlers.length; i++)
                   handlers[i] = new Handler(String.valueOf(i));
   
               AtomicInteger idx = new AtomicInteger();
   
   
               while(true) {
   
                   master.select();
   
                   Iterator<SelectionKey> iter = master.selectedKeys().iterator();
                   while (iter.hasNext()) { //遍历Selector中监听到的事件
   
                       SelectionKey key = iter.next();
                       iter.remove();
   
                       if(key.isAcceptable()) {
                           //事件：有客户端已建立连接（类似的事件还有 isReadable, isWriteable, isConnected）
                           SocketChannel channel = server.accept(); //获取建立的通道
                           channel.configureBlocking(false);
                           handlers[idx.getAndIncrement() % handlers.length].register(channel);
                           //循环选择线程，将通道注册到其下
                           // 在这里，我们已经接受了客户端的连接，并且拿到了与客户端通信的Channel，后面我们只需要分配一个线程，去处理客户端的请求即可
                       }
                       else {
                           key.cancel();
                       }
                   }
               }
           }catch (Exception e){
               e.printStackTrace();
           }
   ```

### 服务器的设计

需要用到的NIO知识大概就这么多，下面可以来设计服务器了

想法如图：



![服务器架构](https://s2.loli.net/2022/06/01/nVMgXLfQOB6C7ts.png)

服务器总是运行一个主线程，称为 `master` 线程，监听端口`8081`，来确定是否有客户端尝试连接。

当有一个客户端连接时，我们通过上面的代码，生成一个 `SocketChannel` 并将其传递给一个 `Handler` 线程

由于 `Selector` 是可以管理多个通道的，那么我们其实没必要每次接收到一个连接就新建一个线程（线程会自带 `Selector` ），我们可以创建 `n` 个 `Handler` （这个 `n` 取决于电脑CPU是几核的）

![Server](https://s2.loli.net/2022/06/20/wZi5nhpNeV4Dtf8.png)

于是，我们可以开始编写 `Handler` 了

首先，我们需要一个 `register` 方法，将连接的任务加入到 `Handler` 的任务队列中

事实上，我们可以把一个 `Handler` 当做一个流水线上的工人，他有一个任务列表，不断的做TODO-List中的事项（当然这部分也可以视为模板编程，因为这个大家写的都差不多）

重点是在处理数据的部分：

1. 新建一个 `Method` 对象，这个对象包涵的方法其实就是第一题中 `Server` 中 `Handler` 的方法，但在NIO中，每次遍历的 `key` 只会存在一个关心的事件，这就要求我们在更改其关注的事件时，需要将解析的请求头通过通道的 `attchment` 传递出去

2. 于是，在 `Method` 中解析请求报文完成后，我们将其包装好并传递到此 `Channel` 中的 `attchment` 中，并更改 `key` 关注的事件为 `write` 事件

3. 随后，在下一次询问时，我们会进入 `write` 事件，并通过 `Method` 中的响应方法返回响应报文

   响应方法与第一题中的响应方法类似：

   1. 首先，我们通过 `attchment` 中取出先前包装好的请求报文，并通过响应报文的构造方法，生成一个 `ResponseHeader` 对象
   2. 与先前的服务器类似，我们通过`handle200(SocketChannel, String), handleError(SocketChannel, int)` 等函数对不同的情况发出响应（但在这里需要注意的是，由于传输对象是 `ByteBUffer` 而不是原来的 `byte[]` ，因此我们需要将 `byte[]` 包装为 `ByteBuffer` 后才能输出）

`Handler` 的代码如下：

```java
class Handler implements Runnable{

    private Thread thread;
    private Selector selector;
    private ConcurrentLinkedQueue<Runnable> queue = new ConcurrentLinkedQueue<>();

    public Handler( String name) throws IOException {
        thread = new Thread(this, name);
        thread.start();
        selector = Selector.open();
    }


    public void register(SocketChannel sc) throws IOException {
        queue.add(()->{ //将注册通道加入队列维护
            try {
                sc.register(this.selector,SelectionKey.OP_READ,null); //注册感兴趣的事件
            } catch (ClosedChannelException e) {
                e.printStackTrace();
            }
        });

        selector.wakeup(); //唤醒阻塞的select()方法
    }


    @Override
    public void run() {

        while(true){
            try {

                selector.select();
                Runnable task = queue.poll(); //取出队首并删除结点

                if(task!=null)
                    task.run(); //调用register run方法以注册通道

                Iterator<SelectionKey> iter = this.selector.selectedKeys().iterator();
                while (iter.hasNext()) {
                    SelectionKey key = iter.next();
                    iter.remove();
                    if (key.isReadable()) { //若该事件可读，即收到请求报文
                        Method method = new Method(); //实例化method方法
                        method.processRequest(key); //解析报文并将其附着到该通道所关联的key的attchment中
                        key.interestOps(SelectionKey.OP_WRITE); //将该事件改为可写
                    }
                    else if(key.isWritable()){ //若该事件可写，即需回复报文
                        Method method = new Method();
                        method.processResponse(key); //写响应报文
                    }
                    else
                        key.cancel(); //忽略该事件
                }
            }catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
```

 `Method` 代码如下：

```java
public class Method {

    private final NIOFileHandler nioFileHandler;

    RequestHeader requestHeader;

    ResponseHeader responseHeader;

    Method(){
        nioFileHandler = new NIOFileHandler();
    }

    void processRequest( @NotNull SelectionKey key) throws IOException {

        SocketChannel channel = (SocketChannel) key.channel(); //获取传输报文的通道
        ByteBuffer byteBuffer = ByteBuffer.allocate(Utils.SIZE); //申请一个固定大小的缓冲区
        channel.read(byteBuffer); //将报文写至缓冲区

        byteBuffer.flip(); //翻转读写方式
        String temp = StandardCharsets.UTF_8.decode(byteBuffer).toString(); //将报文格式转变为string
        try{
            RequestHeader requestHeader = Utils.requestParseString(temp);
            key.attach(Optional.of(requestHeader));
            //设置key的attachment字段，而一个key和一个channel绑定，即可后续从通道中获取该请求报文
        }
        catch (Exception e){
            e.printStackTrace();
        }

    }

    void processResponse( @NotNull SelectionKey key ) throws IOException {

        SocketChannel channel = (SocketChannel) key.channel();
        Optional<RequestHeader> op = (Optional<RequestHeader>) key.attachment(); //请求报文

        if(op.isEmpty()){
            handle400(channel); //错误请求
            channel.close(); //关闭通道
            return;
        }

        requestHeader = op.get();
        responseHeader = new ResponseHeader(requestHeader);

        try{
            handle200(channel, requestHeader.getUrl());
        }
        catch (FileNotFoundException e){
            handle404(channel);
        }
        catch (Exception e){
            handle500(channel);
        }
        finally {
            channel.close();
        }

    }

    private void handle400( SocketChannel channel ) {
        try{
            handleError(channel, 400);
        }
        catch (Exception e){
            handle500(channel);
        }
    }

    private void handle404( SocketChannel channel ) {
        try{
            handleError(channel, 404);
        }
        catch (Exception e){
            handle500(channel);
        }

    }

    private void handle500( SocketChannel channel ) {
        try{
            handleError(channel, 500);
        }
        catch (Exception e){
            e.printStackTrace();
        }

    }

    private void handle501( SocketChannel channel ){
        try{
            handleError(channel, 501);
        }
        catch (Exception e){
            e.printStackTrace();
        }
    }

    private void handle200( @NotNull SocketChannel channel ,String url ) throws IOException {
        responseHeader.setCode(200);
        String method = requestHeader.getMethod();
        if(method.equals(Utils.MethodName.GET.toString())){

            if(url.equals(Utils.EXIT)){
                Server.flag.set(0);
                System.exit(-1);
            }

            ByteBuffer responseBody = nioFileHandler.read("web/request/" + url);
            responseHeader.setContent_length(responseBody.capacity());
            responseHeader.setContent_type(Utils.queryFileType(url));
            ByteBuffer responseHead = ByteBuffer.wrap(responseHeader.toString().getBytes(StandardCharsets.UTF_8));
            //将string格式转变为butebuffer
            channel.write(new ByteBuffer[]{responseHead, responseBody});
        }
        else if(method.equals(Utils.MethodName.HEAD.toString())){
            ByteBuffer responseHead = ByteBuffer.wrap(responseHeader.toString().getBytes(StandardCharsets.UTF_8));
            channel.write(responseHead);
        }
        else if(method.equals(Utils.MethodName.POST.toString())){
            String data = requestHeader.getData();
            responseHeader.setContent_length(0);
            responseHeader.setContent_type("");
            nioFileHandler.write("db/data.txt", data);
            ByteBuffer responseHead = ByteBuffer.wrap(responseHeader.toString().getBytes(StandardCharsets.UTF_8));
            channel.write(responseHead);
        }
        else if(method.equals(Utils.MethodName.PUT.toString())){
            String data = Utils.mdToHtml(requestHeader.getData());
            ByteBuffer responseBody = StandardCharsets.UTF_8.encode(data);
            responseHeader.setContent_type(Utils.queryFileType(".html"));
            responseHeader.setContent_length(responseBody.limit());
            ByteBuffer responseHead = ByteBuffer.wrap(responseHeader.toString().getBytes(StandardCharsets.UTF_8));
            channel.write(new ByteBuffer[]{responseHead, responseBody});
        }
        else {
            handle501(channel);
        }

    }

    private void handleError( @NotNull SocketChannel channel ,int code ) throws IOException {
        responseHeader.setCode(code);

        String filename = "web/error/" + code + ".html";
        ByteBuffer responseBody = nioFileHandler.read(filename);
        responseHeader.setContent_length(responseBody.capacity());
        responseHeader.setContent_type(Utils.queryFileType(filename));
        requestHeader.setVersion(this.requestHeader.getVersion());
        ByteBuffer responseHead = ByteBuffer.wrap(responseHeader.toString().getBytes(StandardCharsets.UTF_8));

        channel.write(new ByteBuffer[]{responseHead, responseBody});
    }

}

class NIOFileHandler{

    NIOFileHandler(){}


    ByteBuffer read(String filename) throws IOException{

        RandomAccessFile access = new RandomAccessFile(filename, "r");

        FileChannel channel = access.getChannel();
        ByteBuffer byteBuffer = ByteBuffer.allocate((int)channel.size());

        channel.read(byteBuffer);
        byteBuffer.flip();

        return byteBuffer;
    }

    void write(String filename, String data) throws IOException{

        RandomAccessFile access = new RandomAccessFile(filename, "rw");

        FileChannel channel = access.getChannel();
        ByteBuffer byteBuffer = StandardCharsets.UTF_8.encode(data);

        channel.write(byteBuffer);

    }

}
```

测试后，发现吞吐量确实上升很快

## NIO Proxy

NIO的代理，难写的点在于，NIO处理读写的代码结构与 `Socket` 那种完全不同，因此，在对NIO仅仅只是了解了皮毛的基础上，我只能写出一个能跑，但是效率不怎么高的代理服务器...

代理的想法还是很简单，只需要转送报文即可。于是，我们采用与NIO Server相同的结构，来完成这一代理：

```java
public class Proxy {

    private static final int PORT = 8080;

    public static void main( String[] args ) {

        ExecutorService threadPool = Executors.newScheduledThreadPool(200);

        try(ServerSocketChannel server = ServerSocketChannel.open()){

            server.bind(new InetSocketAddress(PORT));
            server.configureBlocking(false);
            Selector master = Selector.open();
            server.register(master, SelectionKey.OP_ACCEPT);
            while (Server.flag.get() == 1) {
                master.select();
                Iterator<SelectionKey> iterator = master.selectedKeys().iterator();
                while (iterator.hasNext()) {
                    SelectionKey key = iterator.next();
                    iterator.remove();
                    if (key.isAcceptable()) {
                        SocketChannel client = server.accept();
                        threadPool.execute(new ProxyHandler(client));
                    } else
                        key.cancel();
                }
            }

        }
        catch (IOException e){
            e.printStackTrace();
        }
    }
}

class ProxyHandler implements Runnable{

    private final SocketChannel client;

    String host;

    int port = 80;

    RequestHeader requestHeader;

    ResponseHeader responseHeader;

    ProxyHandler(SocketChannel client){
        this.client = client;
    }

    @Override
    public void run() {

        try {

        } catch (IOException e) {
            e.printStackTrace();
        }

    }
}
```

这里采用的是线程池的方法，每次都用一个线程，两个 `Selector` 来处理一次连接

可以画图表现为

![Handler](https://s2.loli.net/2022/06/20/cWVyagru76mDiPx.png)

但我们如何在接受完客户端的请求报文后，立刻为服务器写报文呢？

我的想法是，直接创建一个 `SocketChannel` 通过请求报文中的 `Host` 字段直接连接到服务器，并将此通道注册到新建的选择器下，将监测事件选择为可写

然后，遍历选择器中的事件，为可写时，直接向服务器发送报文，并将 `key` 关心的事件更改为可读，以读取服务器的响应报文，读取完后，我们就可以关掉这个 `Selector` 和 `SocketChannel` 了

这样，我们可以写入如下代码：

```java
try {

            client.configureBlocking(false);
            Selector clientSelector = Selector.open();
            client.register(clientSelector, SelectionKey.OP_READ);
            int over = 1; //标记是否与客户端断开通道
            while (over == 1) {
                clientSelector.select();
                Iterator<SelectionKey> clientIt = clientSelector.selectedKeys().iterator();
                while (clientIt.hasNext()) {
                    SelectionKey clientKey = clientIt.next();
                    clientIt.remove();

                    if (clientKey.isReadable()) { //获取到客户端的请求报文

                        SocketChannel clientChannel = (SocketChannel) clientKey.channel(); //获取与客户端连接的通道
                        ByteBuffer content = ByteBuffer.allocate(Utils.SIZE);
                        clientChannel.read(content);
                        content.flip();
                        requestHeader = Utils.requestParseByteBuffer(content); //解析请求报文

                        host = requestHeader.getHost(); //获取目的服务器与处理url
                        int idx = host.indexOf(":");
                        if (idx != -1) {
                            port = Integer.parseInt(host.substring(idx + 1));
                            host = host.substring(0 ,idx);
                            String[] parts = requestHeader.getUrl().split("/");
                            requestHeader.setUrl(parts[ parts.length - 1 ]);
                        }

                        SocketChannel server = SocketChannel.open(); //与服务器建立通道
                        server.connect(new InetSocketAddress(host, port));
                        server.configureBlocking(false);

                        Selector serverSelector = Selector.open();
                        server.register(serverSelector , SelectionKey.OP_WRITE); //向该selector注册一个可写的事件
                        int flag = 1; //标记是否与服务器断开通道
                        while (flag == 1) {

                            serverSelector.select();
                            Iterator<SelectionKey> serverIt = serverSelector.selectedKeys().iterator();

                            while (serverIt.hasNext()) {

                                SelectionKey serverKey = serverIt.next();
                                serverIt.remove();
                                if (serverKey.isWritable()) { //即代理向服务器传送请求报文
                                    SocketChannel serverChannel = (SocketChannel) serverKey.channel();
                                    ByteBuffer trans = ByteBuffer.wrap(
                                            requestHeader.trans().getBytes(StandardCharsets.UTF_8)
                                    );
                                    serverChannel.write(trans);
                                    serverKey.interestOps(SelectionKey.OP_READ); //改为可读
                                }
                                else if (serverKey.isReadable()) { //即收到服务器的响应报文
                                    SocketChannel serverChannel = (SocketChannel) serverKey.channel();
                                    ByteBuffer response = ByteBuffer.allocate(Utils.SIZE);
                                    serverChannel.read(response);
                                    response.flip();
                                    responseHeader = Utils.responseParseByteBuffer(response);
                                    serverChannel.close();
                                    flag = 0;
                                }

                            }
                        }

                        clientKey.interestOps(SelectionKey.OP_WRITE); //改为可写，向客户端传回响应报文
                    } else if (clientKey.isWritable()) {
                        SocketChannel clientChannel = (SocketChannel) clientKey.channel();
                        ByteBuffer response = ByteBuffer.wrap(responseHeader.trans().getBytes(StandardCharsets.UTF_8));
                        clientChannel.write(response);
                        over = 0;
                    }
                }
            }

        } catch (IOException e) {
            e.printStackTrace();
        }
```

这里有两个地方需要注意：

1. 注意到这里有 `over` 与 `flag` 两个标识符来判断什么时候可以结束监听 `Selector`

2. 注意到这里我们新增了两个 `trans` 方法：

   ```java
   // IN RequestHeader
   public String trans(){
       StringBuilder sb = new StringBuilder();
   
       sb.append(String.format("%s %s %s\r\n", getMethod(), getUrl(), getVersion()));
       for(String K : headMap.keySet())
           sb.append(String.format("%s:%s\r\n", K, headMap.get(K)));
       sb.append("\r\n");
       sb.append(data.toString());
   
       return sb.toString();
   }
   ```

   ```java
   // IN ResopnseHeader
   public String trans(){
       this.setContent_length(data.toString().getBytes(StandardCharsets.UTF_8).length);
   
       StringBuilder ret = new StringBuilder();
       ret.append(String.format("%s %d %s\r\n", getVersion(), code, code_meaning));
       ret.append(String.format("Server: %s\r\n", getServer()));
       ret.append(String.format("Content-Type: %s\r\n", getContent_type()));
       ret.append(String.format("Content-Length: %d\r\n", getContent_length()));
       ret.append("Date:").append(new Date()).append("\r\n\r\n");
   
       ret.append(data.toString());
   
       return ret.toString();
   }
   ```

   这两个函数用来写转运时的报文头与报文体

至此，我们的工作已经做完了，NIO部分的代理与服务器的结构如下图所示

![Design](https://s2.loli.net/2022/06/20/DSXmPVMRKnT7eYa.png)

### jmter压测：



打开代理后：

![1000并发数](https://s2.loli.net/2022/06/23/iDJK9CO7dtXTqYI.png)

![Result](https://s2.loli.net/2022/06/23/Lyizavp8BTo2eXW.png)

![10000并发数](https://s2.loli.net/2022/06/23/UogqiDlNvACuRSV.png)

![Result](https://s2.loli.net/2022/06/23/S8AqoMaHQmsPFiO.png)

若不使用代理，则NIO服务器的压测为：

![Result-1](https://s2.loli.net/2022/06/21/FlKnq8fycdbW2eH.png)

![Result-2](https://s2.loli.net/2022/06/21/5obBe3ZMF2LWVzp.png)

![Result-3](https://s2.loli.net/2022/06/23/gP1iOYurbIZQWhJ.png)

------

# 困难与问题

- 在问题一中，需要去了解报文头中各个参数的含义，在写报文头时遇到了一些 `bug` ，如在第一次写报文时将 `Content-Length` 与 `Transfer-Encoding` 同时写进报文头中；
- 实验过程中，由于浏览器对报文格式的要求并不严格，如即使不传送 `Content-Length` ，浏览器也能够显示传送的报文体内容，但对于 `postman` 而言这样是不行的，这种对报文格式的区别要求也为调试代码带来了一些困难；
- 在实现代理的过程中，由于数组习惯性的开大了，于是在传送报文体的过程中，字节数组总会有未被用完的部分，但这部分也被传送出去，导致在字符串的后面会出现大量的`NULL`，这种错误在浏览器端可以被自动忽略，但在 `postman` 中会报错。由于 `postman` 并不支持查看错误的响应报文，于是只能自己写一个客户端，将响应报文输出到文件中查看（见第二题中的 `client.java`）
- 由于原生的 `NIO` 编程与 `Socket` 编程有很大的不同，在实现过程中遇到的问题很多，包括但不限于如何在多线程模式下尽最大可能使用 `Selector` 来保证并发量，如何合理管理内存使得在并发量很大的情况下能够安全运行而不发生内存泄漏，如何避免粘包与半包问题。

以上问题大多数都已解决，但对于`Java`如何合理管理内存依然存在疑问，由于 `Java` 的自动 `gc` 机制导致不能像使用 `C/C++` 那样直接对内存进行操作，因此在 `NIO` 中，若并发数太多，便会抛出内存不够的异常。此问题日后会尽力去解决，并完善自己的 `NIO` 服务器。

------



# 总结

本次实验中使用Java语言开发了一个简单的Web服务器，了解并熟悉了套接字的使用以及多线程接管连接的实现；同时，开发了一个简单的多线程Web代理服务器，了解并熟悉了代理的运行机制以及线程池的工作；最后，使用NIO实现服务器支持连接的并发功能，了解了NIO的定义以及优势。在这个过程中，我学习了浏览器和`postman`的代理测试，以及压测的一定知识等等，收获颇丰。



