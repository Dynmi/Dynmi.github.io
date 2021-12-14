---
layout: post
comments: false
title:  "C++ Object Model"
excerpt: "..."
date:   2021-12-13 23:40
mathjax: false
---

C++是一门支持面向对象的高级语言。那C++对象的内存是怎么管理的呢？

为了更直观地理解，下面我会多次使用ANIS C来近似模拟C++类和对象操作。

## 引入：一个简单例子
C++类中的成员变量位于数据段内存和堆栈段内存（进一步定位：是否const或static）。C++成员函数就是单纯的函数，位于代码段内存。

这里定义了一个简单的类Animal，并用ANIS C做了模拟。
```
// C++
class Animal {
public:
    Animal(int _age, double _energy) {
        age = _age;
        energy = _energy;
    };
    ~Animal() = default;

    void eat(double klr) {
        energy += klr;
    }

    int getAge() const {
        return age;
    }

    int age;
    double energy;
    static float height;
}


// ANIS C
typedef struct  {
    int age;
    double energy;
    static float height;
} Animal;
void _ZN4AnimalC2Ev(Animal* this, int age, double energy) { // 构造函数Animal::Animal()
    this->age = age;
    this->energy = energy;
}
void _ZN4Animal5eatEv(Animal* this, double klr) { // Animal::eat(double kl)
    this->energy += klr;
}
int _ZN4Animal5getAgeEv(const Animal* this) { // Animal::getAge() const
    return this->age;
}

```

当使用Animal类对象的时候，比如我这样使用：

```
// C++
{
    Animal obj(4, 64.22);
    obj.eat(10.33);
}

就类似于

// ANIS C
{
    Animal obj;
    _ZN4AnimalC2Ev(&obj, 4, 64.22);
    _ZN4Animal5eatEv(&obj, 10.33);
}
```

站在C++编译器的视角来看obj的内存空间是这样的：
```
.data
-------------------
| 4 bytes  height |
-------------------

.stack
-------------------
| 4 bytes     age |
-------------------
4bytes 空的
-------------------
| 8 bytes  energy |
-------------------

.text
-------------------
_ZN4AnimalC2Ev ...
-------------------
_ZN4Animal5eatEv ...
-------------------
_ZN4Animal5getAgeEv ...
-------------------
```

## 面向对象之封装

## 面向对象之继承

## 面向对象之多态

## Reference