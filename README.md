# KLBuffer   

`KLBuffer`是一个用于Nodejs中处理与C++交互过程中的数字数组与Buffer互相转化的工具类；支持数据类型有：char、uchar、short、ushort、int、uint、float、double等


## 安装   
```
npm install kl-buffer
```

### 使用

### 1. 读写值
```typescript
let klBuffer = KLBuffer.alloc(2);
console.log(klBuffer.ucharArray);
// 输出：[0,0]
klBuffer.ucharArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
console.log(klBuffer.ucharArray);
// 输出：[1,2,3,4,5,6,7,8,9,10]
console.log(klBuffer.uchar[5]);
// 输出：6
klBuffer.uchar[5] = 50;
console.log(klBuffer.uchar[5]);
// 输出：50

klBuffer.doubleArray = [1.5, 2.5];
console.log(klBuffer.doubleArray);
// 输出：[1.5,2.5]
console.log(klBuffer.double[0]);
// 输出：1.5
klBuffer.double[0] = 3.5;
console.log(klBuffer.double[0]);
// 输出：3.5
```
#### 2. 从已有buffer中拷贝数据
##### 2.1 API
```typescript
type NumberArray = Int8Array | Uint8Array | Uint8ClampedArray |
  Int16Array | Uint16Array |
  Int32Array | Uint32Array |
  BigInt64Array | BigUint64Array |
  Float32Array | Float64Array;
type DataSource = Buffer | NumberArray | DataView | number;

KLBuffer.from(
  /** 数据来源 */
  data: DataSource,
  /** 对应数据的字节大小 */
  size: number,
  /** 是否深拷贝；默认值: false */
  deepCopy?: boolean,
) => Buffer|null
```
##### 2.2 深拷贝
```typescript
let klBuffer1 = KLBuffer.alloc(10);
let klBuffer2 = KLBuffer.alloc(10);
klBuffer1.ucharArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
console.log(klBuffer2.ucharArray);
// 输出：[0,0,0,0,0,0,0,0,0,0]

klBuffer2.from(klBuffer1.ptr, 10, true);
console.log(klBuffer2.ucharArray);
// 输出：[1,2,3,4,5,6,7,8,9,10]

klBuffer2.uchar[2] = 30;
console.log(klBuffer2.ucharArray);
// 输出：[1,2,30,4,5,6,7,8,9,10]
console.log(klBuffer1.ucharArray);
// 输出：[1,2,3,4,5,6,7,8,9,10]
console.log(klBuffer1.ptrVal, klBuffer2.ptrVal);
  // 2611228548128 2611228547776
```
##### 2.3 浅拷贝
```typescript
let klBuffer1 = KLBuffer.alloc(10);
let klBuffer2 = KLBuffer.alloc(10);
klBuffer1.ucharArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
console.log(klBuffer2.ucharArray);
// 输出：[0,0,0,0,0,0,0,0,0,0]

klBuffer2.from(klBuffer1.ptr, 10, false); // 两者共用内存地址
console.log(klBuffer2.ucharArray);
// 输出：[1,2,3,4,5,6,7,8,9,10]

klBuffer2.uchar[2] = 30;
console.log(klBuffer2.ucharArray);
// 输出：[1,2,30,4,5,6,7,8,9,10]
console.log(klBuffer1.ucharArray);
// 输出：[1,2,30,4,5,6,7,8,9,10]
console.log(klBuffer1.ptrVal, klBuffer2.ptrVal);
  // 1470764395952 1470764395952
```

##### 2.4 跨线程传递数据
> **使用过程中需保证buffer数据没有被回收！**
```typescript
const { KLBuffer } = require('kl-buffer');
const {
  Worker,
  isMainThread,
  setEnvironmentData,
  getEnvironmentData,
} = require('worker_threads');

if (isMainThread) {
  // 主进程
  const klBuffer = KLBuffer.alloc(2);
  setEnvironmentData('klBuffer', [klBuffer.ptrVal, klBuffer.size]);
  new Worker(__filename);
  setInterval(() => {
    klBuffer.uchar[0] = klBuffer.uchar[0] + 1;
    // 可以观察到与子线程的内存地址与数据均一致
    console.log(klBuffer.ptrVal, klBuffer.ucharArray, 'main');
  }, 1000)
} else {
  // 子线程
  const [ptrVal, size] = getEnvironmentData('klBuffer');
  const klBuffer = KLBuffer.alloc(size, ptrVal);
  setInterval(() => {
    klBuffer.uchar[1] = klBuffer.uchar[1] + 1;
    // 可以观察到与主线程的内存地址与数据均一致
    console.log(klBuffer.ptrVal, klBuffer.ucharArray, 'child');
  }, 1000)
}
```