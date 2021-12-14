---
layout: post
comments: false
title:  "C++ Object Model"
excerpt: "..."
date:   2021-12-13 23:40
mathjax: false
---

C++是一门支持面向对象的高级语言。那C++对象的内存是怎么管理的呢？

为了更直观地理解，下面我会多次使用ANSI C来近似模拟C++类和对象操作。

## 引入：一个简单例子
C++类中的成员变量位于数据段内存和堆栈段内存（进一步定位：是否const或static）。C++成员函数就是单纯的函数，位于代码段内存。

这里定义了一个简单的类Animal，并用ANSI C做了模拟。因为我们并没有
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


// ANSI C
typedef struct  {
    int age;
    double energy;
    static float height;
} Animal;
void _ZN4Animal5eatEv(Animal* this, double klr) { // Animal::eat(double kl)
    this->energy += klr;
}
int _ZN4Animal5getAgeEv(const Animal* this) { // Animal::getAge() const
    return this->age;
}
void _ZN4AnimalC1Ev(Animal* this, int age, double energy) { // 构造函数Animal::Animal()
    this->age = age;
    this->energy = energy;
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

// ANSI C
{
    Animal obj;
    _ZN4AnimalC1Ev(&obj, 4, 64.22);
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
  4 bytes     空
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

在x86_64机器上，sizeof(Animal) = sizeof(double) * 2 = 16。如果我们把Animal::eat()改为虚函数，会发现sizeof(Animal) = 24。多了什么呢？8 bytes，应该是个指针。对就是指针。`void* vptr`。这个指针指向放在.data段（静态量、常量区）里的虚函数表，可以理解为一个指针数组。这个类有多少个虚函数，虚函数表就有多少个槽，放着多少个指针，指向函数地址。

现在，我们把Animal::eat()和Animal::getAge()都改为虚函数。

那么修改后的C++ Animal类就近似于ANSI C中的：
```
// ANSI C
typedef struct  {
    static void* vptr;
    int age;
    double energy;
    static float height;
} Animal;
void _ZN4Animal5eatEv(Animal* this, double klr) { // Animal::eat(double kl)
    this->energy += klr;
}
int _ZN4Animal5getAgeEv(const Animal* this) { // Animal::getAge() const
    return this->age;
}
const static void* vTable[2] = {&_ZN4Animal5eatEv, &_ZN4Animal5getAgeEv};
void _ZN4AnimalC1Ev(Animal* this, int age, double energy) { // 构造函数Animal::Animal()
    this->v_ptr = vTable;
    this->age = age;
    this->energy = energy;
}
```

## Reference
- Intro to the C++ Object Model, Richard Powell, 2015