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

进程的主线程的tid作为进程pid。新进程（主线程）是由父进程通过fork系列系统调用来创建，新线程则由同进程内其他线程pthread_create()创建。init进程和kthreadd进程在内核加载启动的时候由系统idle task创建。
user task均是init（pid=1）的子孙，kernel task都是kthreadd（pid=2）的子孙。

因此，不同于其他人的叙述，下面我将多处使用“task”来表示一个线程，即一个任务主体。

## user task VS kernel task

## task生命周期的设计

<div class="imgcap">
<img src="/assets/multitask/stat.png">
</div>

当一个thread被启动，首先是TASK_RUNNING状态，被加入就绪队列中等待被调度到CPU执行。

各状态的出现频率从高到低依次是：

TASK_RUNNING（R）：进一步分为RUNNING态和READY态。RUNNING即正在占用CPU，READY即未占有CPU，等待条件满足被分配CPU。

TASK_INTERRUPTIBLE（S）：进程的主状态就是R态，S态可视为进程暂时等待的状态，一经召唤就立刻转入R态。

TASK_UNINTERRUPTIBLE（D）：通常是在等待IO，比如磁盘IO，网络IO，其他外设IO，如果进程正在等待的IO在较长的时间内都没有响应，那么就被ps看到了，同时也就意味着很有可能有IO出了问题，可能是外设本身出了故障，也可能是比如挂载的远程文件系统已经不可访问了。被其他进程的wake_up()唤醒。

TASK_STOPPED（T）：R状态的任务收到SIGSTOP时转入T状态，临时暂停。T状态的任务收到SIGCONT时转入t状态，继续执行。

TASK_TRACED（t）：被追踪的状态，task暂停。比如在gdb中对被跟踪的进程下一个断点，进程在断点处停下来的时候就处于task_traced状态。而在其他时候，被跟踪的进程还是处于前面提到的那些状态。

EXIT_ZOMBIE（Z）：若父进程销毁时还有存活的子进程，子进程会更改PPID为1，即被init进程接管。反之，子进程退出时会给父进程发送SIGCHLD信号，父进程收到SIGCHLD后销毁子进程，删除其task_struct，这需要父进程中显示调用wait来完成。如果子进程已退出而父进程尚未调用wait为其收尸，则该进程进入僵尸状态。

EXIT_DEAD（X）：task销毁前的很短暂的一个状态，几乎无法被ps捕捉到。


## 多任务间如何通信

### 信号signal

### 信号量semaphores

二元信号量/ 计数信号量/ 读者写者信号量， 在内核区维护，无法直接被用户进程访问

### 共享内存shared_memory

### 锁

## 多任务间如何分配调度CPU

因为CPU核心数<<待执行任务数，因此需要优越的CPU分配调度算法，以平衡多个task的CPU占用。

SCHED_NORMAL 普通进程

SCHED_RR/SCHED_FIFO 实时进程

goodness()

多CPU等待队列负载均衡

schedule()是如何被执行的？ 
当没有屏蔽中断的RUNNING中的task收到时钟中断，timer_interrupt()会被执行。timer_interrupt()中会调用schedule()。
请注意，一个task在进行系统调用（内部触发）和中断（外设触发）时都只是调用内核API而已，此时还是该task在CPU上运行着，只是从“用户态”转到了“内核态”。