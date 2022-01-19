---
layout: post
comments: true
title:  "the Architecture of MultiTask in Operating System"
excerpt: "..."
date:   2022-01-07 11:10:00
mathjax: true
---

## linux进程和线程的关系

在linux中，“进程”即若干个共享虚拟内存空间（共享代码段和数据段，堆栈各自独有）、共享文件和设备的“线程”的集合。

严谨地讲，linux中任务的粒度是thread，而不是process。在linux中，task_struct是和thread一一对应，而不是和process一一对应！

进程的主线程的tid作为进程pid。诞生时，进程（主线程）是由父进程通过fork系列系统调用来创建，线程则由主线程pthread_create()创建。init进程和kthreadd进程在内核加载启动的时候由系统创建。
用户进程均是init进程的子孙，内核线程都是kthreadd的子孙。

因此，不同于其他人的叙述，下面我将多处使用“thread”来表示一个任务。

## 内核thread和用户thread的区别

## thread生命周期的设计

<div class="imgcap">
<img src="/assets/multitask/stat.png">
</div>

当一个thread被启动，首先是TASK_RUNNING状态，被加入就绪队列中等待被调度到CPU执行。

各状态的出现频率从高到低依次是：

TASK_RUNNING（R）：

TASK_INTERRUPTIBLE（S）：

TASK_UNINTERRUPTIBLE（D）：通常是在等待IO，比如磁盘IO，网络IO，其他外设IO，如果进程正在等待的IO在较长的时间内都没有响应，那么就被ps看到了，同时也就意味着很有可能有IO出了问题，可能是外设本身出了故障，也可能是比如挂载的远程文件系统已经不可访问了。被其他进程的wake_up()唤醒。

TASK_STOPPED（T）：R状态的任务收到SIGSTOP时转入T状态，临时暂停。T状态的任务收到SIGCONT时转入t状态，继续执行。

TASK_TRACED（t）：被追踪的状态，任务暂停。比如在gdb中对被跟踪的进程下一个断点，进程在断点处停下来的时候就处于task_traced状态。而在其他时候，被跟踪的进程还是处于前面提到的那些状态。

EXIT_ZOMBIE（Z）：若父进程销毁时还有存活的子进程，子进程会更改PPID为1，即被init进程接管。反之，子进程退出时会给父进程发送SIGCHLD信号，父进程收到SIGCHLD后销毁子进程，删除其task_struct，这需要父进程中显示调用wait来完成。如果子进程已退出而父进程尚未调用wait为其收尸，则该进程进入僵尸状态。

EXIT_DEAD（X）：进程销毁前的很短暂的一个状态，几乎无法被ps捕捉到。


## 多任务间如何通信

### 信号SIGNAL

### 信号量SEMAPHONA

### 共享内存SHARED_MEMORY

### 锁

## 多任务间如何分配调度CPU

CPU核心数<<就绪任务数

SCHED_NORMAL 普通进程

SCHED_RR/SCHED_FIFO 实时进程

goodness()

多CPU等待队列负载均衡
