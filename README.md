# KLBuffer   

Fast write/read Buffer in javascript way.


## Installation   

Install with npm:
```
npm install kl-buffer
```

## class KLBuffer   

### Static Function   

`KLBuffer.alloc(size:number, data:Buffer|TypedArray|DataView|number, deepCopy:boolean) => KLBuffer`    
  Allocates a new KLBuffer of size bytes.

- param
  - `size` The desired length of the new Buffer
  - `data` (optional) Initialize data. Buffer/TypedArray/DataView/The memory address of the buffer instance
  - `deepCopy` (optional) Whether to copy data in depth. Defaults to false


`KLBuffer.parseDataToBuffer(data:Buffer|TypedArray|DataView|number, size:number) => Buffer|null`   
  Parse data to buffer

- param
  - `data` Data to be parsed. Buffer/TypedArray/DataView/The memory address of the buffer instance
  - `size` The length of the returned Buffer.


### Instance Property   

`buffer` Buffer instance   

`ptrVal` The memory address of the buffer instance   

`ptr` Memory block first address pointer   

`size` The length of the buffer  

### Instance Function   

`.from(data:Buffer|TypedArray|DataView|number, size:number, deepCopy:boolean) => KLBuffer` Copies data from a Buffer or TypedArray or DataView.

- param
  - `data` Copyed data. Buffer/TypedArray/DataView/The memory address of the buffer instance
  - `size` The length of the returnd Buffer
  - `deepCopy` (optional) Defaults to false


`.set(val:number)` A value to pre-fill the buffer with.

- param
  - `val` (optional) Defaults to 0



### Fast write/read Buffer in javascript way

- char array
- uchar array
```javascript
  let klBuffer = KLBuffer.alloc(2);
  console.log(klBuffer.ucharArray); //[0,0]
  klBuffer.ucharArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  console.log(klBuffer.ucharArray); //[1,2,3,4,5,6,7,8,9,10]
  console.log(klBuffer.uchar[5]); //6
  klBuffer.uchar[5] = 50;
  console.log(klBuffer.uchar[5]); //50
```

- short array
- ushort array
- int array
- uint array
- float array
- double array
```javascript
  let klBuffer = KLBuffer.alloc(16);
  console.log(klBuffer.doubleArray); //[0,0]
  klBuffer.doubleArray = [1.5, 2.5];
  console.log(klBuffer.doubleArray); //[1.5,2.5]
  console.log(klBuffer.double[0]);  //1.5
  klBuffer.double[0] = 3.5;
  console.log(klBuffer.double[0]);  //3.5
```

### pointer

- copy data from pointer
```javascript
  let klBuffer1 = KLBuffer.alloc(10);
  let klBuffer2 = KLBuffer.alloc(10);
  klBuffer1.ucharArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  console.log(klBuffer2.ucharArray); //[0,0,0,0,0,0,0,0,0,0]
  klBuffer2.from(klBuffer1.ptr);
  console.log(klBuffer2.ucharArray); //[1,2,3,4,5,6,7,8,9,10]
```

- initialization buffer width pointer
```javascript
  let klBuffer1 = KLBuffer.alloc(10);
  klBuffer1.ucharArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  let klBuffer2 = KLBuffer.alloc(5, klBuffer1.ucharPtr[5]);
  console.log(klBuffer2.ucharArray); //[6,7,8,9,10]
```

- The difference between deepCopy being true and false
```javascript
  let klBuffer1 = KLBuffer.alloc(10);
  klBuffer1.ucharArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  let klBuffer2 = KLBuffer.alloc(5, klBuffer1.ucharPtr[5], true);
  klBuffer2.ucharArray = [1,2,3,4,5];
  console.log(klBuffer1.ucharArray); //[1,2,3,4,5,6,7,8,9,10]

  let klBuffer3 = KLBuffer.alloc(5, klBuffer1.ucharPtr[5], false);
  klBuffer3.ucharArray = [1,2,3,4,5];
  console.log(klBuffer1.ucharArray); //[1,2,3,4,5,1,2,3,4,5]

  console.log(klBuffer1.ptrVal, klBuffer2.ptrVal, klBuffer3.ptrVal);
  // 2540086547104 2540086697424 2540086547109
```