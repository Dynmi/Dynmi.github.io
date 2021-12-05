---
layout: post
comments: false
title:  "std::move() & std::forward() in C++"
excerpt: "..."
date:   2021-1-11 19:00:00
mathjax: false
---


## Intro

C++里的value可以直观地分为：立即数、单变量、对象。

```
string str = "HELLOWORLD"

int i = 1024

int j = 1024 + i

int* ptr = &i

ptr = new int[20]

CMyClass obj = CMyClass(1, 2)
```

立即数：`"HELLOWORLD"` , `1024` , `1024 + i`

单变量：`str` , `i` , `j` , `ptr`

对象：`obj` , `CMyClass(1, 2)`


如果我们进一步思考挖掘，可以发现，value还可以二分类为左值（lvalue, locator value）、右值（rvalue）。

左值：这个值管理着一片内存空间，后面可以直接寻址。如`str` , `i` , `obj` , `ptr`

右值：配合左值，后面无法直接寻址。如`"HELLOWORLD"` , `CMyClass(1,2)` , `1024 + i`

Ok。到这里我们已经有了基本逻辑。

## 左值引用

让我们更进一步，设想这样一种情况：
如果前面已经有了一个lvalue1，它已经占用了一定内存空间，管理着一些数据。后面我们又需要一个lvalue2，它需要和lvalue1管理相同的数据。如何操作？
- 拷贝。再开一片内存空间，把前面value的内存复制一份过去。但要增加内存开销！ 
- 取指针。直接用指针取lvalue1的地址。但lvalue2的数据类型就必须是指针类型了！

为了优化这里，C++语法支持了“左值引用”（locator reference）：在栈内存中分配出一个指针的空间，让指针指向被引用方的内存地址。
```
    int a = 20;
    int& b = a;
    int c = b;
```
编译后（在x86_64的机器）
```
	movl	$20, -24(%rbp)

	leaq	-24(%rbp), %rax
	movq	%rax, -16(%rbp)
	
	movq	-16(%rbp), %rax
	movl	(%rax), %eax
	movl	%eax, -20(%rbp)
```

Ok。到这里我们知道了C++左值引用语义的来龙去脉。接下来继续探索。

## 移动构造（右值引用 + std::move()）

如你所知，C++区别于C最大的一点就是C++有面向对象。我们知道在一个class中，如果程序员不去手动实现的话，编译器会默认补充无参构造函数、拷贝构造函数、重载赋值运算符，确保每个类都支持此三者的功能。默认拷贝构造函数和默认重载赋值运算符都是对类做内存拷贝，即将一个类对象的内存块原封不动的拷贝到另一个新的对象（当前对象）的所代表的内存块。但是默认的拷贝构造函数和默认重载运算符都是浅拷贝。当类通过成员指针去管理着一块堆内存时，需要进行深拷贝，要求程序员手动实现这两者，完成堆内存拷贝。

```
class CMyClass {
public:
    CMyClass();
    CMyClass(const CMyClass& that);
    CMyClass opreator=(const CMyClass& that);

private:    

};
```

问题来了，如果源对象的成员变量管理着一块堆内存，那么“复制拷贝”既耗时又耗内存，这个操作真的合适吗？

在某些场景下，我们确实希望就是单纯地拷贝复制，得到两个独立又相同的对象。

在某些场景下，我们只需要留下一个对象就够。

那这个拷贝操作就不合理了！因此C++11标准添加了“右值引用”和“移动语义”，以支持将源对象的内存管理权直接移交给目标对象，这样就不用拷贝复制长长的堆内存了！

为了实现这一点，我们要添加一对新的构造函数和重载赋值运算符：移动构造函数和重载移动赋值运算符。为了区别后两个和前两个，用&&来表示右值引用，区别于左值引用&。
```
    CMyClass(const CMyClass& that);
    CMyClass opreator=(const CMyClass& that);

    CMyClass(CMyClass&& that);
    CMyClass opreator=(CMyClass&& that);
```

当程序员没有自定义移动构造时：

- 若程序员自定义了拷贝构造，编译器不会补充默认移动构造。

- 若程序员自定义了重载赋值运算符，编译器不会补充默认移动构造。

- 若程序员自定义了析构函数，编译器不会补充默认移动构造。

默认移动构造，只是单纯的使用“ = ”将前后两个对象的成员变量连接。 因此对于类成员里的基本类型，只是内存拷贝，对于类成员里实现了移动构造的对象，会调用其移动构造。类成员里的指针也不会置空。

如果一个类既有拷贝构造，也有移动构造。那么调用的时候如何区分开两者呢？比如我想用`CMyClass a`来构造`CMyClass b`，那应该怎么写呢？ 没有std::move()的话，`CMyClass b(a);`很难按照程序员意愿选择拷贝构造或移动构造。

从高级语言层次看，std::move()只是做了一个static_cast，将`T xxx`强制转型为`T&& xxx`。从内存层次看，就是在栈内存上分配了一个指针，让指针指向`xxx`的内存地址。

这样就可以在调用的时候区分开拷贝构造和移动构造了！
```
CMyClass a(1, 2);
CMyClass b(a);              // 调用CMyClass(CMyClass& that)
CMyClass c(std::move(a));   // 调用CMyClass(CMyClass&& that)
```

“右值引用”和“左值引用”有多大区别？从内存层次看，并没有太大区别，都类似于指针：
```
    int&& b = 20;
    int c = b;
```
编译后（在x86_64的机器上）
```
	movl	$20, %eax
	movl	%eax, -24(%rbp)
	leaq	-24(%rbp), %rax
	movq	%rax, -16(%rbp)
	
	movq	-16(%rbp), %rax
	movl	(%rax), %eax
	movl	%eax, -20(%rbp)
```

`int&& b = 20;` 和 `int temp = 20; int& b = temp` 以及 `int temp = 20; int* b = &temp;` 从内存层次看是一样的！


## std::forward()的用途

xxx

## Reference
- https://en.cppreference.com/w/cpp/language/move_constructor
- https://en.cppreference.com/w/cpp/utility/move
- https://en.cppreference.com/w/cpp/utility/forward
