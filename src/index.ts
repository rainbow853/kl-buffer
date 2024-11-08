// @ts-ignore
import ref from 'ref-napi';
const emptyBuffer = Buffer.alloc(0);
const emptyBufferAddress = emptyBuffer.address();
export type NumberArray = Int8Array | Uint8Array | Uint8ClampedArray |
  Int16Array | Uint16Array |
  Int32Array | Uint32Array |
  BigInt64Array | BigUint64Array |
  Float32Array | Float64Array;
export type DataSource = Buffer | NumberArray | DataView | number;

type readFn = 'readInt8' | 'readUInt8' | 'readInt16LE' | 'readUInt16LE' | 'readInt32LE' | 'readUInt32LE' | 'readFloatLE' | 'readDoubleLE'
type writeFn = 'writeInt8' | 'writeUInt8' | 'writeInt16LE' | 'writeUInt16LE' | 'writeInt32LE' | 'writeUInt32LE' | 'writeFloatLE' | 'writeDoubleLE'

/**
 * Intercept the accessor and assignment of array.
 * @param klBuffer KLBuffer instance
 * @param bytes Number of bytes
 * @param getFun Accessor function name
 * @param setFun Assignment function name
 */
function createArray(klBuffer: KLBuffer, bytes: number, getFun: readFn, setFun: writeFn): number[] {
  return new Proxy<number[]>([], {
    get(target, propKey: string) {
      const index = parseInt(propKey);
      if (isNaN(index)) return null;

      return klBuffer.buffer[getFun](index * bytes) as any;
    },
    set: function (obj, propKey: string, value: number) {
      const index = parseInt(propKey);
      if (isNaN(index)) return false;

      klBuffer.buffer[setFun](value, index * bytes);
      return true;
    }
  })
}

/**
 * Intercept the accessor of array.
 * @param klBuffer KLBuffer instance
 * @param bytes Number of bytes
 */
function createPtrArray(klBuffer: KLBuffer, bytes: number): Buffer[] {
  return new Proxy<Buffer[]>([], {
    get(target, propKey: string) {
      const index = parseInt(propKey);
      if (isNaN(index)) return null;

      return index ? klBuffer.buffer.reinterpret(1, index * bytes) : klBuffer.ptr;
    }
  })
}

/**
 * Cannot be used across processes
 */
class KLBuffer {
  /** Buffer instance */
  buffer: Buffer = emptyBuffer
  /** The memory address of the buffer instance */
  ptrVal: number = emptyBufferAddress
  /** Memory block first address pointer */
  ptr: Buffer | null = null
  /** char数组 */
  char: number[]
  /** uchar数组 */
  uchar: number[]
  /** short数组 */
  short: number[]
  /** ushort数组 */
  ushort: number[]
  /** int数组 */
  int: number[]
  /** uint数组 */
  uint: number[]
  /** float数组 */
  float: number[]
  /** double数组 */
  double: number[]
  /** charPtr首地址 */
  charPtr: Buffer[]
  /** ucharPtr地址指针数据 */
  ucharPtr: Buffer[]
  /** shortPtr地址指针数据 */
  shortPtr: Buffer[]
  /** ushortPtr地址指针数据 */
  ushortPtr: Buffer[]
  /** intPtr地址指针数据 */
  intPtr: Buffer[]
  /** uintPtr地址指针数据 */
  uintPtr: Buffer[]
  /** floatPtr地址指针数据 */
  floatPtr: Buffer[]
  /** doublePtr地址指针数据 */
  doublePtr: Buffer[]
  constructor(size: number, data?: DataSource, deepCopy?: boolean) {
    // Parse buffer into javascript array by char type.
    this.char = createArray(this, 1, 'readInt8', 'writeInt8');
    // Parse buffer into javascript array by uchar type.
    this.uchar = createArray(this, 1, 'readUInt8', 'writeUInt8');
    // Parse buffer into javascript array by short type.
    this.short = createArray(this, 2, 'readInt16LE', 'writeInt16LE');
    // Parse buffer into javascript array by ushort type.
    this.ushort = createArray(this, 2, 'readUInt16LE', 'writeUInt16LE');
    // Parse buffer into javascript array by int type.
    this.int = createArray(this, 4, 'readInt32LE', 'writeInt32LE');
    // Parse buffer into javascript array by uint type.
    this.uint = createArray(this, 4, 'readUInt32LE', 'writeUInt32LE');
    // Parse buffer into javascript array by float type.
    this.float = createArray(this, 4, 'readFloatLE', 'writeFloatLE');
    // Parse buffer into javascript array by double type.
    this.double = createArray(this, 8, 'readDoubleLE', 'writeDoubleLE');

    // Pointer array of buffer memory address specified offset obtained by char type; Please use in the same thread.
    this.charPtr = this.ucharPtr = createPtrArray(this, 1);
    this.shortPtr = this.ushortPtr = createPtrArray(this, 2);
    this.intPtr = this.uintPtr = this.floatPtr = createPtrArray(this, 4);
    this.doublePtr = createPtrArray(this, 8);

    data ? this.from(data, size, deepCopy) : this.alloc(size);
  }

  /**
   * Allocates a new KLBuffer of size bytes.
   * @param size The desired length of the new Buffer
   * @param data Initialize data
   * @param deepCopy
   */
  static alloc(size: number, data?: DataSource, deepCopy?: boolean): KLBuffer {
    return new KLBuffer(size, data, deepCopy);
  }

  /**
   * Parse data to buffer
   * @param data
   * @param size
   */
  static parseDataToBuffer(data: DataSource, size: number): Buffer | null {
    if (typeof data === 'number') {
      let pointer = ref.alloc('pointer');
      // 32-bit/64-bit system
      pointer.length === 8 ? pointer.writeUInt64LE(data, 0) : pointer.writeUInt32LE(data, 0);
      return pointer.readPointer(0, size);
    }

    // data instanceof NumberArray: Throw NumberArray is not defined.
    const arrayBuffer = data ? data.buffer : null
    if (arrayBuffer && arrayBuffer instanceof ArrayBuffer) {
      return Buffer.from(data.buffer, data.byteOffset, Math.min(size, data.buffer.byteLength - data.byteOffset));
    }

    return null;
  }


  /**
   * Number of bytes of buffer
   */
  get size() {
    return this.buffer.length;
  }

  /**
   * Parse the buffer by char type and return the parsed javascript array
   */
  get charArray(): number[] {
    return this.readAll(this.buffer.readInt8, 1);
  }

  /**
   * Parse array by char type and fill buffer
   */
  set charArray(array: number[]) {
    this.writeAll(this.buffer.writeInt8, 1, array);
  }

  /**
   * Parse the buffer by uchar type and return the parsed javascript array
   */
  get ucharArray(): number[] {
    return this.readAll(this.buffer.readUInt8, 1);
  }

  /**
   * Parse array by uchar type and fill buffer
   */
  set ucharArray(array: number[]) {
    this.writeAll(this.buffer.writeUInt8, 1, array);
  }

  /**
   * Parse the buffer by short type and return the parsed javascript array
   */
  get shortArray(): number[] {
    return this.readAll(this.buffer.readInt16LE, 2);
  }

  /**
   * Parse array by short type and fill buffer
   */
  set shortArray(array: number[]) {
    this.writeAll(this.buffer.writeInt16LE, 2, array);
  }

  /**
   * Parse the buffer by ushort type and return the parsed javascript array
   */
  get ushortArray(): number[] {
    return this.readAll(this.buffer.readUInt16LE, 2);
  }

  /**
   * Parse array by ushort type and fill buffer
   * @param {array} array
   */
  set ushortArray(array: number[]) {
    this.writeAll(this.buffer.writeUInt16LE, 2, array);
  }

  /**
   * Parse the buffer by int type and return the parsed javascript array
   */
  get intArray(): number[] {
    return this.readAll(this.buffer.readInt32LE, 4);
  }

  /**
   * Parse array by int type and fill buffer
   */
  set intArray(array: number[]) {
    this.writeAll(this.buffer.writeInt32LE, 4, array);
  }

  /**
   * Parse the buffer by uint type and return the parsed javascript array
   */
  get uintArray(): number[] {
    return this.readAll(this.buffer.readUInt32LE, 4);
  }

  /**
   * Parse array by uint type and fill buffer
   */
  set uintArray(array: number[]) {
    this.writeAll(this.buffer.writeUInt32LE, 4, array);
  }

  /**
   * Parse the buffer by float type and return the parsed javascript array
   */
  get floatArray(): number[] {
    return this.readAll(this.buffer.readFloatLE, 4);
  }

  /**
   * Parse array by float type and fill buffer
   */
  set floatArray(array: number[]) {
    this.writeAll(this.buffer.writeFloatLE, 4, array);
  }

  /**
   * Parse the buffer by double type and return the parsed javascript array
   */
  get doubleArray(): number[] {
    return this.readAll(this.buffer.readDoubleLE, 8);
  }

  /**
   * Parse array by double type and fill buffer
   */
  set doubleArray(array: number[]) {
    this.writeAll(this.buffer.writeDoubleLE, 8, array);
  }

  /**
   * Get the array according to the javascript basic data type
   */
  readAll(readFn: (offset: number) => number, bytes: number): number[] {
    let length = ~~(this.size / bytes);
    readFn = readFn.bind(this.buffer);
    const array: number[] = [];
    for (let i = 0; i < length;) {
      array.push(readFn((i++) * bytes))
    }
    return array;
  }

  /**
   * Get the array according to the javascript basic data type
   */
  writeAll(writeFn: (val: number, offset: number) => number, bytes: number, array: number[]) {
    if (array.length * bytes !== this.buffer.length) this.alloc(array.length * bytes);
    writeFn = writeFn.bind(this.buffer);
    array.forEach((val, i) => writeFn(val, i * bytes));
  }

  /**
   * Copies data from a Buffer or NumberArray or DataView. **The memory address maybe updated**
   * @param data Initialize data
   * @param size The default size is - 1, and the copy is equal to the length of this buffer
   * @param deepCopy
   */
  from(data: DataSource, size?: number, deepCopy?: boolean) {
    if (!size) return this.allocEmpty();

    let buffer = KLBuffer.parseDataToBuffer(data, size > 0 ? size : this.buffer.length);
    if (!buffer) return;
    if (!buffer.length) return this.allocEmpty();

    if (deepCopy) {
      this.buffer.length !== buffer.length && this.alloc(buffer.length);
      buffer.copy(this.buffer, 0, 0, buffer.length);
    } else {
      this.buffer = buffer;
      this.ptrVal = ref.address(this.buffer);
      this.ptr = this.buffer.reinterpret(1, 0);
    }
  }

  /**
   * A value to pre-fill the buffer with.
   * @param val Default: 0.
   */
  set(val: number = 0) {
    this.buffer.fill(val);
  }

  /**
   * Alloc empty buffer
   */
  allocEmpty() {
    this.buffer = emptyBuffer;
    this.ptrVal = emptyBufferAddress;
    this.ptr = null;
  }

  /**
   * Reassign size
   * **The memory address will be updated**
   */
  alloc(size?: number) {
    size = Math.max(0, size || 0);
    if (this.buffer.length === size) return;
    if (!size) return this.allocEmpty();

    this.buffer = Buffer.alloc(size);
    this.ptrVal = ref.address(this.buffer);
    this.ptr = this.buffer.reinterpret(1, 0);
  }

}

export { KLBuffer, KLBuffer as default }