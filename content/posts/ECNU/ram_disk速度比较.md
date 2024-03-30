---
categories:
- InNight
cover: wallpaper/20230628184041.png
date: "2022-05-08 22:25:01"
description: 为什么MINIX你是微内核！我不理解！
keywords:
- OS
- ECNU
math: true
title: ECNU DaSE2020 OS_HW3 RAM与Disk读写速度对比
---


# 实验目的

1. 熟悉类UNIX系统的I/O设备管理
2. 熟悉MINIX块设备驱动
3. 熟悉MINIX RAM盘

# 实验环境

开发环境：`VS Code (GNU)`

宿主机系统环境：`Windows10 +  WSL2（Ubuntu 20.04）`

虚拟机应用：`VMware WorkStation16`

虚拟机环境：`MINIX3`

# 实验过程

## 源码版本回退

输入命令 `git reset HEAD^`即可回退到`project-2`的前一个版本（原始版本）

## 创建RAM盘并挂载

列出需要新增/修改的文件：

- `/usr/src/minix/drivers/storage/memory/memory.c` M
- `/usr/src/minix/commands/ramdisk/Makefile` M
- `/usr/src/minix/commands/ramdisk/buildmyram.c` U

1. 在 `/usr/src/minix/drivers/storage/memory/memory.c` 中将

   ```c
   RAMDISKS=6
   ```

   改为

   ```c
   RAMDISKS=7
   ```

2. 在 `/usr/src/minix/commands/ramdisk/Makefile` 中添加

   ```makefile
   PROG=	buildmyram
   ```

3. 添加文件 `buildmyram.c` （仿照 `ramdisk.c` 实现）

   ```c
   
   #include <minix/paths.h>
   
   #include <sys/ioc_memory.h>
   #include <stdio.h>
   #include <fcntl.h>
   #include <stdlib.h>
   
   int
   main(int argc, char* argv[]) {
       int fd;
       signed long size;
       char* d;
   
       if (argc < 2 || argc > 3) {
           fprintf(stderr, "usage: %s <size in MB> [device]\n",
               argv[0]);
           return 1;
       }
   
       d = argc == 2 ? _PATH_RAMDISK : argv[2];
       if ((fd = open(d, O_RDONLY)) < 0) {
           perror(d);
           return 1;
       }
   
   #define MFACTOR 1048576
       size = atol(argv[1]) * MFACTOR;
   
       if (size < 0) {
           fprintf(stderr, "size should be non-negative.\n");
           return 1;
       }
   
       if (ioctl(fd, MIOCRAMSIZE, &size) < 0) {
           perror("MIOCRAMSIZE");
           return 1;
       }
   
       fprintf(stderr, "size on %s set to %ldMB\n", d, size / MFACTOR);
   
       return 0;
   }
   
   ```

4. 创建RAM盘

   输入命令 `mknod /dev/myram b 1 13` 来创建实验用RAM盘，可以使用 `ls /dev/ | grep ram` 来查看是否创建成功

   在`root`目录下创建文件夹 `myram` 便于接下来的挂载

5. 设置RAM大小并挂载

   由于每次重启都要重新设置RAM的大小并挂载，这里写一个脚本 `project3.sh` 来实现

   ```shell
   buildmyram 512 /dev/myram
   mkfs.mfs /dev/myram
   mount /dev/myram /root/myram
   df
   ```

   首次运行前，需要先输入 `chmod u+x project3.sh` 后，输入 `./project3.sh` 

## 测试代码

### 任务一：探究并发数为多少时，吞吐量达到饱和

代码如下：

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <math.h>
#include <errno.h>
#include <time.h>

const char filepath[] = "/root/myram/test.txt";
int text[1024];

void
write_file(int blocksize) {
    int fd = open(filepath, O_RDWR | O_CREAT | O_SYNC, 0755);
    if (fd < 0)
        perror("open");
    for (int i = 0;i < 1000;i++) {
        if (write(fd, text, blocksize) != blocksize)
            perror("write");
    }
    lseek(fd, 0, SEEK_SET);
}

int
main(void) {
    memset(text, 0, sizeof text);
    struct timeval t1, t2;
    for (int num = 1; num <= 120; num++) {
        gettimeofday(&t1, NULL);
        for (int i = 0;i < num; i++) {
            int pid = fork();
            if (pid == 0) {
                write_file(1024);
                exit(0);
            }
        }
        while (wait(NULL) != -1)
            ;
        gettimeofday(&t2, NULL);
        double t = (double)(t2.tv_sec - t1.tv_sec) * 1000 + (t2.tv_usec - t1.tv_usec) / 1000;
        double filesize = 1000 * sizeof(text) * num / 1024.0 / 1024.0 / t;
        if (t == 0)
            filesize = 0;
        printf("%lf,%lf,%d\n", filesize, t / 1000.0, num);
    }
}

```

在 `MINIX` 中运行上述代码，并输出到 `res.txt` 中。

![运行命令](https://s2.loli.net/2022/05/08/LWKbTZOFSqEPu7C.png)

传输到本机后，转换为 `csv` 文件，使用 `python` 处理数据后作图

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv('res.csv')
df.sort_values(by=['process num'], inplace=True)
df = pd.DataFrame(df.groupby(by=['process num']).max())
df = df.replace([np.inf], np.nan)
print(df)
data = df.to_numpy()
data = pd.DataFrame(data, columns=['concurrency', 'time'])
data['concurrency'] = data['concurrency'].interpolate(method='spline', order=3)
data = data.dropna().to_numpy()
y1, y2 = [], []
for i in range(len(data)):
    y1.append(data[i][0])
    y2.append(data[i][1])
y1, y2 = np.array(y1), np.array(y2)
x = []
for i in range(1, 121):
    x.append(i)
x = np.array(x)
plt.plot(x, y1, label='concurrency')
plt.plot(x, y2, label='I/O latency')
plt.legend()
plt.show()

```

作图如下

![性能测试](https://s2.loli.net/2022/05/12/Kjo1yeIaHx7N4AU.png)

可以发现进程数大约在15时，RAM达到饱和，使得吞吐量趋于稳定

于是，将后续的并发数设置为 `15`

### 任务二：探究在不同block size条件下，RAM与Disk的性能对比

1. 读写函数

```c
void
write_file(int blocksize, bool isrand, char* filepath) {
    int fd = open(filepath, O_RDWR | O_CREAT | O_SYNC, 0755);
    if (fd == -1) perror("Open");
    for (int i = 0;i < MAX_ITER;i++) {
        if (write(fd, text, blocksize) != blocksize)
            perror("Write");
        if (isrand)
            lseek(fd, rand() % (MAX_FILESIZE - blocksize), SEEK_SET);
    }
    lseek(fd, 0, SEEK_SET);
}

void
read_file(int blocksize, bool isrand, char* filepath) {
    int fd = open(filepath, O_RDWR | O_CREAT | O_SYNC, 0755);
    if (fd == -1) perror("Open");
    for (int i = 0;i < MAX_ITER;i++) {
        if (read(fd, buff, blocksize) != blocksize)
            perror("Read");
        if (isrand)
            lseek(fd, (MAX_ITER - 1) * (rand() % blocksize), SEEK_SET);
    }
    lseek(fd, 0, SEEK_SET);
}
```

2. 时间计算，这里使用 `struct timeval` 来记录时间

   ```c
   double
   calc_time(struct timeval t1, struct timeval t2) {
       return (double)(t2.tv_sec - t1.tv_sec) * 1000 + (t2.tv_usec - t1.tv_usec) / 1000;
   }
   
   ```

3. `main`函数，接受三个参数，`argv[1]` 表示读`R`或写`W`，`argv[2]` 表示是RAM`R`还是Disk`D`，`argv[3]`  表示是顺序`S`还是随机`R`

   ```c
   int
   main(int argc, char* argv[]) {
       printf("BlockSize(KB),FileSize(MB),Speed(MB/s)\n");
       srand((unsigned)time(NULL));
       struct timeval t1, t2;
       double t;
       for (int i = 0;i < MAX_BUFFER;i += 16) {
           strcat(text, "1111111111111111");
       }
       for (int blocksize = 64;blocksize <= 1024 * 32;blocksize = blocksize * 2) {
           int proc_num = 15;
           gettimeofday(&t1, NULL);
           for (int i = 0;i < proc_num;i++) {
               if (fork() == 0) {
                   if (strcmp(argv[1], "W") == 0) {
                       if (strcmp(argv[2], "R") == 0) {
                           if (strcmp(argv[3], "S") == 0)
                               write_file(blocksize, false, filepathram[i]);
                           else
                               write_file(blocksize, true, filepathram[i]);
                       }
                       else {
                           if (strcmp(argv[3], "S") == 0)
                               write_file(blocksize, false, filepathdisk[i]);
                           else
                               write_file(blocksize, true, filepathdisk[i]);
                       }
                   }
                   else {
                       if (strcmp(argv[3], "R") == 0) {
                           if (strcmp(argv[3], "S") == 0)
                               read_file(blocksize, false, filepathram[i]);
                           else
                               read_file(blocksize, true, filepathram[i]);
                       }
                       else {
                           if (strcmp(argv[3], "S") == 0)
                               read_file(blocksize, false, filepathdisk[i]);
                           else
                               read_file(blocksize, true, filepathdisk[i]);
                       }
                   }
                   exit(0);
               }
           }
           while (wait(NULL) != -1);
           gettimeofday(&t2, NULL);
           t = calc_time(t1, t2) / 1000.0;
           int total_size = blocksize * proc_num * MAX_ITER;
   
           printf("%lf,%lf,%lf\n", 1.0 * blocksize / 1024,
               1.0 * total_size / 1024 / 1024, 1.0 * total_size / t / 1024 / 1024);
           // printf("blocksize_KB=%.4fKB,filesize_MB=%.4fMB,speed=%fMB/s\n",
       //     (double)blocksize / 1024.0,
       //     (double)total_size / 1024.0 / 1024.0,
       //     (double)total_size / t / 1024.0 / 1024.0);
       }
       return 0;
   }
   ```

完整代码如下

```c
#include<stdio.h>
#include<stdlib.h>
#include<unistd.h>
#include<sys/types.h>
#include<sys/stat.h>
#include<sys/wait.h>
#include<fcntl.h>
#include<time.h>
#include<string.h>
#include <errno.h>

#define MAX_ITER 1000
#define MAX_BUFFER (1024*1024)
#define MAX_FILESIZE (300*1024*1024)
#define MAX_BUFFSIZE (1024*1024*1024)

enum bool{ false, true };
typedef enum bool bool;

const char* filepathram[30] = {
    "/root/myram/test1.txt", "/root/myram/test2.txt",
    "/root/myram/test3.txt","/root/myram/test4.txt",
    "/root/myram/test5.txt","/root/myram/test6.txt",
    "/root/myram/test7.txt","/root/myram/test8.txt",
    "/root/myram/test9.txt","/root/myram/test10.txt",
    "/root/myram/test11.txt", "/root/myram/test12.txt",
    "/root/myram/test13.txt","/root/myram/test14.txt",
    "/root/myram/test15.txt","/root/myram/test16.txt",
    "/root/myram/test17.txt"
};

const char* filepathdisk[30] = {
    "/usr/test1.txt", "/usr/test2.txt",
    "/usr/test3.txt", "/usr/test4.txt",
    "/usr/test5.txt", "/usr/test6.txt",
    "/usr/test7.txt", "/usr/test8.txt",
    "/usr/test9.txt", "/usr/test10.txt",
    "/usr/test11.txt", "/usr/test12.txt",
    "/usr/test13.txt", "/usr/test14.txt",
    "/usr/test15.txt", "/usr/test16.txt",
    "/usr/test17.txt"
};

char text[MAX_BUFFER] = "11111111";
char buff[MAX_BUFFSIZE];

void
write_file(int blocksize, bool isrand, char* filepath) {
    int fd = open(filepath, O_RDWR | O_CREAT | O_SYNC, 0755);
    if (fd == -1) perror("Open");
    for (int i = 0;i < MAX_ITER;i++) {
        if (write(fd, text, blocksize) != blocksize)
            perror("Write");
        if (isrand)
            lseek(fd, (MAX_ITER - 1) * (rand() % blocksize), SEEK_SET);
    }
    lseek(fd, 0, SEEK_SET);
}

void
read_file(int blocksize, bool isrand, char* filepath) {
    int fd = open(filepath, O_RDWR | O_CREAT | O_SYNC, 0755);
    if (fd == -1) perror("Open");
    for (int i = 0;i < MAX_ITER;i++) {
        if (read(fd, buff, blocksize) != blocksize)
            perror("Read");
        if (isrand)
            lseek(fd, (MAX_ITER - 1) * (rand() % blocksize), SEEK_SET);
    }
    lseek(fd, 0, SEEK_SET);
}

double
calc_time(struct timeval t1, struct timeval t2) {
    return (double)(t2.tv_sec - t1.tv_sec) * 1000 + (t2.tv_usec - t1.tv_usec) / 1000;
}

int
main(int argc, char* argv[]) {
    printf("BlockSize(KB),FileSize(MB),Speed(MB/s)\n");
    srand((unsigned)time(NULL));
    struct timeval t1, t2;
    double t;
    for (int i = 0;i < MAX_BUFFER;i += 16) {
        strcat(text, "1111111111111111");
    }
    for (int blocksize = 64;blocksize <= 1024 * 32;blocksize = blocksize * 2) {
        int proc_num = 15;
        gettimeofday(&t1, NULL);
        for (int i = 0;i < proc_num;i++) {
            if (fork() == 0) {
                if (strcmp(argv[1], "W") == 0) {
                    if (strcmp(argv[2], "R") == 0) {
                        if (strcmp(argv[3], "S") == 0)
                            write_file(blocksize, false, filepathram[i]);
                        else
                            write_file(blocksize, true, filepathram[i]);
                    }
                    else {
                        if (strcmp(argv[3], "S") == 0)
                            write_file(blocksize, false, filepathdisk[i]);
                        else
                            write_file(blocksize, true, filepathdisk[i]);
                    }
                }
                else {
                    if (strcmp(argv[3], "R") == 0) {
                        if (strcmp(argv[3], "S") == 0)
                            read_file(blocksize, false, filepathram[i]);
                        else
                            read_file(blocksize, true, filepathram[i]);
                    }
                    else {
                        if (strcmp(argv[3], "S") == 0)
                            read_file(blocksize, false, filepathdisk[i]);
                        else
                            read_file(blocksize, true, filepathdisk[i]);
                    }
                }
                exit(0);
            }
        }
        while (wait(NULL) != -1);
        gettimeofday(&t2, NULL);
        t = calc_time(t1, t2) / 1000.0;
        int total_size = blocksize * proc_num * MAX_ITER;

        printf("%lf,%lf,%lf\n", 1.0 * blocksize / 1024,
            1.0 * total_size / 1024 / 1024, 1.0 * total_size / t / 1024 / 1024);
        // printf("blocksize_KB=%.4fKB,filesize_MB=%.4fMB,speed=%fMB/s\n",
    //     (double)blocksize / 1024.0,
    //     (double)total_size / 1024.0 / 1024.0,
    //     (double)total_size / t / 1024.0 / 1024.0);
    }
    return 0;
}

```

编写脚本 `run.sh` 如下

```shell
clang mission2.c -o mission2

./mission2 W R S > RamSeqWrite.csv
echo RamSeqWrite Completed
./mission2 R R S > RamSeqRead.csv
echo RamSeqRead Completed
rm myram/*.txt

./mission2 W D S > DiskSeqWrite.csv
echo DiskSeqWrite Completed
./mission2 R D S > DiskSeqRead.csv
echo DiskSeqRead Completed
rm /usr/*.txt

./mission2 W R R > RamRdWrite.csv
echo RamRdWrite Completed
./mission2 R R R > RamRdRead.csv
echo RamRdRead Completed
rm myram/*.txt

./mission2 W D R > DiskRdWrite.csv
echo DiskRdWrite Completed
./mission2 R D R > DiskRdRead.txt
echo DiskRdRead Completed
rm /usr/*.txt
```

在 `MINIX` 环境下 `chmod u+x run.sh` 与 `./run.sh` 即可运行。

将输出文件导入到 `excel` 后作图：

也可以用 `python` 作图

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

filepath = [
    "DataSet/RamSeqWrite.csv", "DataSet/RamSeqRead.csv",
    "DataSet/RamRdWrite.csv", "DataSet/RamRdRead.csv",
    "DataSet/DiskSeqWrite.csv", "DataSet/DiskSeqRead.csv",
    "DataSet/DiskRdWrite.csv", "DataSet/DiskRdRead.csv",
]

check = [(0, 4), (1, 5), (2, 6), (3, 7)]
title = ['Seq Write', 'Seq Read', 'Random Write', 'Random Read']
for i in range(len(check)):
    df1 = pd.read_csv(filepath[check[i][0]])
    df2 = pd.read_csv(filepath[check[i][1]])
    x = df1['BlockSize(KB)'].to_numpy()
    y1 = df1['Speed(MB/s)'].to_numpy()
    y2 = df2['Speed(MB/s)'].to_numpy()
    plt.plot(x, y1, label='Ram')
    plt.plot(x, y2, label='Disk')
    plt.xlabel('BlockSize(KB)')
    plt.ylabel('Speed(MB/s)')
    plt.title(title[i])
    plt.legend()
    plt.show()

```

作图如下：

![顺序写](https://s2.loli.net/2022/05/09/wk32c4zsRynGeSu.png)

![顺序读](https://s2.loli.net/2022/05/09/FH3oxuBR7KP8Xkf.png)

![随机写](https://s2.loli.net/2022/05/09/tvSjXRwq4r9FMuT.png)

![随机读](https://s2.loli.net/2022/05/09/YMvEuTLt4csedow.png)

# 总结

微内核真麻烦😐

设计是好设计，好就好在_______________________________



