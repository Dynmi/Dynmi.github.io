---
layout: post
comments: true
title:  "the Architecture of MultiTask in Operating System"
excerpt: "..."
date:   2022-01-07 11:10:00
mathjax: true
---

## Intro

在linux中，“进程”即若干个共享虚拟内存空间（共享代码段和数据段，堆栈各自独有）、共享文件和设备的“线程”的集合。
严谨地讲，linux中任务的粒度是thread，而不是process。在linux中，task_struct是和thread一一对应，而不是和process一一对应！因此，不同于其他人的叙述，下面我将多处使用“thread”来表示一个任务。

## thread生命周期的设计

<div class="imgcap">
<img src="/assets/multitask/stat.png">
</div>

TASK_RUNNING

TASK_INTERRUPTIBLE

TASK_UNINTERRUPTIBLE

TASK_STOPPED

TASK_TRACED

EXIT_ZOMBIE

EXIT_DEAD


## 多任务间如何通信

## 内核thread和用户thread的区别

## linux的CPU分配调度

CPU核心数<<就绪任务数

## 