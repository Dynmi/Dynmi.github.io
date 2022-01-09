---
layout: post
comments: true
title:  "Memory Management of C++ Object Model"
excerpt: "..."
date:   2021-12-13 23:40
mathjax: false
---

C++是一门支持面向对象的高级语言。那C++对象的内存是怎么管理的呢？

为了更直观地理解，下面我会多次使用ANSI C来近似模拟C++类和对象。

## 引入：一个简单例子
C++类中的成员变量位于数据段内存和堆栈段内存（进一步定位：是否const或static）。C++成员函数就是单纯的函数，位于代码段内存。

这里定义了一个简单的类Animal：
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

// 使用Animal对象
{
    Animal obj(4, 64.22);
    obj.eat(10.33);
}
```

用ANSI C做等价模拟，可以这样表示：

```
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

// 使用Animal对象
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

类内的三个标记public，protected，private是在编译语法检查的时候起作用，语法检查会这样判断是否合格：

- public：不受任何限制
- protected：子类和成员函数可以访问
- private：只有友元函数和成员函数可以访问

对于内存布局，C++11标准是这样规定的：

Members with the same access control level (public, protected, private) are to be allocated in order of declaration within class, not necessarily contiguously.

即，public的成员依次放一起，protected的成员依次放一起，private的成员依次放一起。三者间相对顺序由编译器适情况决定。

## 面向对象之继承

从内存层次看，子类 = 父类 + 程序员写的子类。

这里我们自定义一个Animal的子类Tiger， 并使用了Tiger的对象： 
```
class Tiger: protected Animal {
public:
    void eatMeat() {
        energy += 20;
    }

private:
    char breed;
};

{
    Tiger tobj;
    tobj.eatMeat();
}
```
那么tobj的内存布局是这样的：
```
// 栈区
-------------------
| 4 bytes     age |
-------------------
  4 bytes     空
-------------------
| 8 bytes  energy |
-------------------
| 1 bytes   breed |
-------------------
  7 bytes     空
-------------------

// 全局变量区
-------------------
| 4 bytes  height |
-------------------
```

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

然后我们把Tiger类改为：

```
class Tiger: protected Animal {
public:
    void eat(double klr) {
        energy += 0.5 * klr;
    }
    virtual void eatMeat() {
        energy += 20;
    }

private:
    char breed;
}
```
并声明一个Tiger对象`Tiger tobj;`。那么tobj的栈内存布局为：
```
vptr    8字节
age     4字节
空      4字节
energy  8字节
breed   1字节
空      7字节
```
而vptr指向的虚函数表依次存放着Tiger::eat()，Animal::getAge()，Tiger::eatMeat()三个函数的地址。虚函数表的内容是在编译阶段就确定的。

对于有虚函数的派生类来说，他的堆栈内存空间分布依次为：vptr、父类成员、子类成员。

## Reference
- "Intro to the C++ Object Model", Richard Powell, 2015
- https://en.cppreference.com/w/cpp/language/constructor