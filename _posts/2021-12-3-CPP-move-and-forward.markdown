---
layout: post
comments: false
title:  "std::move() & std::forward() in C++"
excerpt: "..."
date:   2021-1-11 19:00:00
mathjax: false
---


## How to understand `string&& str = ...`

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

让我们更进一步，设想这样一种情况：
如果前面已经有了一个lvalue1，它已经占用了一定内存空间，管理着一些数据。后面我们又需要一个lvalue2，它需要和lvalue1管理相同的数据。如何操作？
- 拷贝。再开一片内存空间，把前面value的内存复制一份过去。但要增加内存开销！ 
- 取指针。直接用指针取lvalue1的地址。但lvalue2的数据类型就必须是指针类型了！

为了优化这里，C++语法支持了“左值引用”（locator reference）：在栈内存中分配出一个指针的空间，让指针指向被引用方的内存地址。如
```
int a = 20; 
int& b = a;     // 这条语句的语义是一个左值引用。
```

Ok。到这里我们知道了C++左值引用语义的来龙去脉。接下来继续探索。

如你所知， C++函数的形参可以写成原状(getSum_1)，也可以写成左值引用(getSum_2)。

```
// 实参可以是左值，也可以是右值
int getSum_1(int a, int b) {
    return a + b;
}

// 实参必须是左值
int getSum_2(int &a, int &b) {
    return a + b;
}

int main() {
    int x = 2;
    int y = 10;
    int z;
    z = getSum_1(99, 111);
    z = getSum_1(x, y);  // 这里进入函数调用后，会将x y的数据拷贝给函数栈内存上。占据2*sizeof(int)空间
    z = getSum_2(x, y);  // 这里进入函数调用后，只会将x y的地址写到函数栈内存上。占据2*sizeof(int*)空间
    return 0;
}
```

|  写法   | 优点  | 缺点 |
|  ----  | ----  | ---- |
| getSum1  | 可传入左值和右值 | 要拷贝，耗时耗内存 |
| getSum2  | 不拷贝，省时省内存 | 只能传入左值 |

总感觉有点遗憾，如果是右值的话，就必须拷贝

右值引用：先将被引用的右值写到栈内存上，然后在内存中分配出一个指针的空间，让指针指向前面的地址。如：
```
int a = 20; 
int&& b = a + a;     // 这条语句的语义是一个右值引用。
```


类的构造函数：
- 默认构造函数 （空构造函数，无额外操作）
- 自定义构造函数
- 复制构造函数
- 移动构造函数

xxxx

## Verification of lvalue reference and rvalue reference

这里在x86_64的机器上，将C++代码编译为汇编代码，截取相关片段：

### 左值引用

```
    int a = 20;

    int& b = a;

    int c = b;
```
编译后
```
	movl	$20, -24(%rbp)

	leaq	-24(%rbp), %rax
	movq	%rax, -16(%rbp)
	
	movq	-16(%rbp), %rax
	movl	(%rax), %eax
	movl	%eax, -20(%rbp)
```

### 右值引用

```
    int&& b = 20;

    int c = b;
```
编译后
```
	movl	$20, %eax
	movl	%eax, -24(%rbp)
	leaq	-24(%rbp), %rax
	movq	%rax, -16(%rbp)
	
	movq	-16(%rbp), %rax
	movl	(%rax), %eax
	movl	%eax, -20(%rbp)
```

## Why C++ support `std::move()` & `std::forward()`

xxxx


## Reference
- xxx
- xxx