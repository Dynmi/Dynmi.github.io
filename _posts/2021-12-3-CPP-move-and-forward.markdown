---
layout: post
comments: false
title:  "std::move & std::forward in C++"
excerpt: "..."
date:   2021-12-3 19:00:00
mathjax: false
---

简言之，为了支持类的移动构造，C++11引入了右值引用和移动语义（std::move()）。为了在模板参数上适配右值引用，C++11引入了完美转发（std::forward()）。


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

默认移动构造，只是单纯的针对每个成员做`A.mem = std::move(B.mem)`。 即：对于类成员里的基本类型，只是内存拷贝；对于类成员里实现了移动构造的对象，会调用其移动构造；类成员里的指针也不会置空。

如果一个类既有拷贝构造，也有移动构造。那么调用的时候如何区分开两者呢？比如我想用`CMyClass a`来构造`CMyClass b`，那应该怎么写呢？ 没有std::move()的话，`CMyClass b(a);`很难按照程序员意愿选择拷贝构造或移动构造。

从高级语言层次看，std::move()只是做了一个static_cast，将`T xxx`强制转型为`T&& xxx`。从内存层次看，就是在栈内存上分配了一个指针，让指针指向`xxx`的内存地址。

这样就可以在调用的时候区分开拷贝构造和移动构造了！
```
CMyClass a(1, 2);
CMyClass b(a);              // 调用CMyClass(CMyClass& that)
CMyClass c(std::move(a));   // 调用CMyClass(CMyClass&& that)
```

这是std::move()的原型：
```
template <typename T>
typename remove_reference<T>::type&& move(T&& t)
{
	return static_cast<typename remove_reference<T>::type&&>(t);
}
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

以下三者从内存层次看，是等价的：
- `int&& b = 20;`
- `int temp = 20; int& b = temp;`
- `int temp = 20; int* b = &temp;` 

右值引用的出现还会带来什么问题呢？接下来继续探索。

## std::forward()的由来

在C++模板中，`class T`的T是未定类型。对于`void func(T&& a)`，当T为`int&&`类型时，函数内的参数即推理为`int&&&& a`；当T为`int&`类型时，函数内的参数即推理为`int&&& a`。从内存层次思考，我们发现无论如何叠加，都可以化简为“左值引用”或“右值引用”。这里总结出这样的规则（引用折叠）：

- 所有的右值引用折叠到右值引用上仍然是右值引用。
- 所有涉及了左值引用的叠加都将折叠为左值引用。

根据这个规律，`void func(T& a)`的实参只能是左值。`void func(T&& a)`的实参可能是左值，也可能是右值。因为程序编译的时候并不会判断`T`类型，执行的时候才去判断，因此C++将`void func(T&& a)`设计成：
- 不论`T&&`的折叠结果是什么，`T&& a`既可以接受左值，也可以接受右值。
- 在`func()`内，a都是一个左值，a类似于一个指针，指向实参的内存地址。

我们习惯性将`T&& a`称为“万能引用”（universal reference）。

但是有些时候，在`func()`里，我们还想知道在调用`func()`时，实参是左值还是右值：
```
template<class T>
void constructor(T& x) {
	...
}

template<class T>
void constructor(T&& x) {
	...
}

template<class T>
void func(T&& a) {

	//这里想调用constructor

}
```
如果直接写`constructor(a)`的话，编译器会默认匹配到`constructor(T& x)`。前面说了，在`func(T&& a)`内，`a`是一个左值。

这里我们就需要`std::forward()`了！ `std::forard()`根据推导做static_cast。我们这样写：`constructor(std::forward<T>(a))`。

那么当`func(T&& a)`的实参是右值时，就会匹配`constructor(T&& x)`，当`func(T&& a)`的实参是左值时，就会匹配`constructor(T& x)`。

以下是C++ Reference中的示例：

```
#include <iostream>
#include <memory>
#include <utility>
 
struct A {
    A(int&& n) { std::cout << "rvalue overload, n=" << n << "\n"; }
    A(int& n)  { std::cout << "lvalue overload, n=" << n << "\n"; }
};
 
class B {
public:
    template<class T1, class T2, class T3>
    B(T1&& t1, T2&& t2, T3&& t3) :
        a1_{std::forward<T1>(t1)},
        a2_{std::forward<T2>(t2)},
        a3_{std::forward<T3>(t3)}
    {
    }
 
private:
    A a1_, a2_, a3_;
};
 
template<class T, class U>
std::unique_ptr<T> make_unique1(U&& u)
{
    return std::unique_ptr<T>(new T(std::forward<U>(u)));
}
 
template<class T, class... U>
std::unique_ptr<T> make_unique2(U&&... u)
{
    return std::unique_ptr<T>(new T(std::forward<U>(u)...));
}
 
int main()
{   
    auto p1 = make_unique1<A>(2); // rvalue
    int i = 1;
    auto p2 = make_unique1<A>(i); // lvalue
 
    std::cout << "B\n";
    auto t = make_unique2<B>(2, i, 3);
}
```
## Reference
- https://en.cppreference.com/w/cpp/language/move_constructor
- https://en.cppreference.com/w/cpp/utility/move
- https://en.cppreference.com/w/cpp/utility/forward
