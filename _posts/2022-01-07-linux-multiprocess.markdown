---
layout: post
comments: true
title:  "the Architecture of MultiTasking in Linux"
excerpt: "..."
date:   2022-01-07 11:10:00
mathjax: true
---

## linux进程和线程的关系

在linux中，“进程”即若干个共享虚拟内存空间（共享代码段和数据段，堆栈各自独有）、共享文件和设备的“线程”的集合。

严谨地讲，linux中任务的粒度是thread，而不是process。在linux中，task_struct是和thread一一对应，而不是和process一一对应！

进程的主线程的spid作为进程pid。新进程（主线程）是由父进程通过fork系列系统调用来创建，新线程则由同进程内其他线程pthread_create()创建。init task和kthreadd task在内核加载启动的时候由系统idle task创建。
user task均是init（pid=1）的子孙，kernel task都是kthreadd（pid=2）的子孙。

因此，不同于其他人的叙述，下面我将多处使用“task”来表示一个线程，即一个任务主体。

## user task VS kernel task

两者性质上相同，在竞争资源的时候都是按照统一的规则（CPU的优先级）来竞争。

user task都是直接或间接由用户启动触发，而kernel task多数由内核自动触发，也可由user task触发。

user task在“内核态”时内存限制在内核区，在“用户态”时内存限制在用户区。kernel task内存始终限制在内核区，其task_struct->mm为NULL。

kernel task常用的有：

[kswapd0]：根据页低阈值(min_free_bytes)的配置，定期回收内存

[ksoftirqd]：处理软中断的内核线程，每个CPU都有一个，当看到此线程对CPU使用率较高时，意味着系统在进行大理的软中断操作，性能会有问题

[kworker]：用于执行内核工作队列，分为绑定 CPU （名称格式为 kworker/CPU86330）和未绑定 CPU（名称格式为 kworker/uPOOL86330）两类。

[migration]：在负载均衡过程中，把进程迁移到 CPU 上。每个 CPU 都有一个 migration 内核线程。


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

信号是异步的，一个task不必通过任何操作来等待信号的到达，只需要在进程中设置信号相应的处理函数，当有信号到达的时候，由系统异步触发相应的处理函数即可。
```
struct task_struct { 
    ... 
    int sigpending; 
    ... 
    struct signal_struct *sig; 
    sigset_t blocked; 
    struct sigpending pending; 
    ... 
} 
```
成员 sigpending 表示进程是否有信号需要处理(1表示有，0表示没有)。成员 blocked 表示被屏蔽的信息，每个位代表一个被屏蔽的信号。成员 sig 表示信号相应的处理方法。

### 信号量semaphores

二元信号量/ 计数信号量/ 读者写者信号量， 在内核区维护，无法直接被用户进程访问

### 共享内存shared_memory

将同一块用户区内存空间分别映射到多个task的VM表里。多个task需要通过信号量等来互斥地操作同一块内存。

### 锁

## 多任务间如何分配调度CPU

因为CPU核心数<<待执行任务数，因此需要优越的CPU分配调度算法，以平衡多个task的CPU占用。

每个CPU都配有4*2=8个任务运行队列。分别是stop_sched_class>rt_sched_class>fair_sched_class>idle_sched_class这四种优先级的任务active队列和exipred队列。每当一个task的现有时间片全部用完，即将它加入相应优先级的expired队列并重新分配时间片。直到所有task都被移动到expired队列，便将active队列和expired队列指针交换。

#### task_struct::policy
task_struct::policy决定了task的调度优先级策略。
- SCHED_OTHER 分时任务；基于红黑树的完全公平调度算法；每次重新获取时间片只得到少量，自己阻塞或者现有时间片耗尽时，主动放弃CPU；时钟中断时若等待队列存在更高优先级的task，则被抢占CPU。
- SCHED_RR 实时任务；每次重新获取时间片只得到少量，自己阻塞或者现有时间片耗尽时，主动放弃CPU；时钟中断时若等待队列存在更高优先级的task，则被抢占CPU。
- SCHED_FIFO 实时任务；自己阻塞时，主动放弃CPU；时钟中断时若等待队列存在更高优先级的task，则被抢占CPU。

task创建时policy默认继承父进程的policy，顺便提一句，init和kthreadd的policy都是SCHED_OTHER。task可以调用sched_setscheduler()来修改其调度优先级策略。后面也可以用`chrt`命令修改task的调度优先级策略。

#### 时间片的获得与消耗
时间片（task_struct::time_slice）的获取发生在两个场景：
- task刚被fork创建：时间片是其父进程的一半。
- task主动或被动地放弃CPU，移入就绪队列的expired队列中：普通task根据它的task_struct::static_prio，实时task根据它的task_struct::rt_priority来重置时间片。优先级越高，分配的时间片越多。我们知道可以通过修改nice来修改普通进程的优先级，注意nice只对应static_prio。
 
```
#define NICE_TO_PRIO(nice)  (MAX_RT_PRIO + (nice) + 20)  
```


#### schedule()

schedule()函数完成任务CPU调度的工作。
schedule()流程:
- 关闭当前 CPU 的抢占功能；
- 如果当前 CPU 的运行队列中不存在任务，调用 idle_balance 从其他 CPU 的运行队列中取一部分执行；
- 调用 pick_next_task 依次访问四个优先级的active队列，找到优先级最高的任务；
- 调用 context_switch 切换运行的上下文，包括寄存器的状态和堆栈；
- 重新开启当前 CPU 的抢占功能；

schedule()是如何被执行的？ 

- （抢占调度）当没有屏蔽中断的RUNNING中的task收到时钟中断，timer_interrupt()会被执行。timer_interrupt()中先调用schedule_tick()判断是否应该抢占，进而调用schedule()。
请注意，一个task在进行系统调用（内部触发）和中断（外设触发）时都只是调用内核API而已，此时还是该task在CPU上运行着，只是从“用户态”转到了“内核态”。
- （非抢占调度）当RUNNING的task主动放弃CPU切换到其他状态时，schedule()也会被调用。