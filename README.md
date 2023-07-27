# Obsidian CodeBlock Tabs

Create tab group for contiguous CodeBlocks.

## Demo

![](screenshot.gif)

## Usage

~~~markdown
```dataview {'title':"Top-10"}
table lang
from "halloworld"
sort lang asc
limit 10
```

```Python {'title':'hallo.py'}
print("Hello World")
```

```Java {'title':'hallo.java'}
import java.io.*;

public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World");
    }
}
```

```Go {'title':'hallo.go'}
println('Hello World");
```

```Cpp {'title':'hallo.cpp'}
#include <iostream>
 
int main() {
    std::cout << "Hello World";
    return 0;
}
```

```JavaScript {'title':'hallo.js'}
console.log("Hello World");
```

```TypeScript {'title':'hallo.ts'}
console.log 'Hello World'
```

```C {'title':'hallo.c'}
#include <stdio.h>

int main() {
    printf("Hello World");
    return 0;
}
```

```Rust {'title':'hallo.rs'}
fn main() {
    println!("Hello, world!");
}
```

```Swift {'title':'hallo.swift'}
println('Hello World');
```

```HTML {'title':'hallo.html'}
<!DOCTYPE html>
<html>
    <head>
    </head>
    <body>
        <h1>Hello World<h1>
    </body>
</html>
```
~~~

## Contributing

Contributions via bug reports, bug fixes, documentation, and general improvements are always welcome. For more major feature work, make an issue about the feature idea / reach out to me so we can judge feasibility and how best to implement it.

## Support

Your love drives me to do better. 

https://buymeacoffee.com/JeminMau