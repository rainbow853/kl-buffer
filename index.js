const ref = require("ref-napi");
const emptyBuffer = Buffer.alloc(0);
const emptyBufferAddress = emptyBuffer.address();

/**
 * Intercept the accessor and assignment of array.
 * @param {KLBuffer} klBuffer KLBuffer instance
 * @param {number} bytes Number of bytes
 * @param {string} getFun Accessor function name
 * @param {string} setFun Assignment function name
 * @returns {Proxy}
 */
function createArray(klBuffer, bytes, getFun, setFun) {
  return new Proxy([], {
    get(target, propKey) {
      const index = parseInt(propKey);
      if (isNaN(index)) return null;

      return klBuffer.buffer[getFun](index * bytes);
    },
    set: function (obj, propKey, value) {
      const index = parseInt(propKey);
      if (isNaN(index)) return null;

      return klBuffer.buffer[setFun](value, index * bytes);
    }
  })
}

/**
 * Intercept the accessor of array.
 * @param {KLBuffer} klBuffer KLBuffer instance
 * @param {number} bytes Number of bytes
 * @returns {Proxy}
 */
function createPtrArray(klBuffer, bytes) {
  return new Proxy([], {
    get(target, propKey) {
      const index = parseInt(propKey);
      if (isNaN(index)) return null;

      return index ? klBuffer.buffer.reinterpret(1, index * bytes) : klBuffer.ptr;
    }
  })
}

/**
 * Cannot be used across processes
 */
module.exports = class KLBuffer {

  /**
   * 
   * @param {number} [size] The desired length of the new Buffer. Default: 0
   * @param {Buffer|TypedArray|DataView|number} [data] Initialize data with Buffer or TypedArray
   * @param {boolean} [deepCopy]
   */
  buffer = emptyBuffer // Buffer instance
  ptrVal = emptyBufferAddress // The memory address of the buffer instance
  ptr = null // Memory block first address pointer
  constructor(size = 0, data, deepCopy) {
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
   * @param {number} size The desired length of the new Buffer
   * @param {Buffer|TypedArray|DataView|number} [data] Initialize data
   * @param {boolean} [deepCopy]
   * @returns {KLBuffer}
   */
  static alloc(size, data, deepCopy) {
    return new KLBuffer(size, data, deepCopy);
  }

  /**
   * Parse data to buffer
   * @param {Buffer|TypedArray|DataView|number} data Buffer/TypedArray/DataView/The memory address of the buffer instance
   * @param {number} size
   * @return {Buffer|null}
   */
  static parseDataToBuffer(data, size) {
    if (typeof data === 'number') {
      let pointer = ref.alloc('pointer');
      // 32-bit/64-bit system
      pointer.length === 8 ? pointer.writeUInt64LE(data, 0) : pointer.writeUInt32LE(data, 0);
      return pointer.readPointer(0, size);
    }

    // data instanceof TypedArray: Throw TypedArray is not defined.
    const arrayBuffer = data ? data.buffer : null
    if (
      arrayBuffer &&
      (arrayBuffer instanceof ArrayBuffer || arrayBuffer instanceof SharedArrayBuffer)
    ) {
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
   * @returns {int[]}
   */
  get charArray() {
    return this.toArray(Int8Array);
  }

  /**
   * Parse array by char type and fill buffer
   * @param {array} array
   */
  set charArray(array) {
    if (array.length !== this.buffer.length) this.alloc(array.length);

    array.forEach((val, i) => this.buffer.writeInt8(val, i));
    // array.forEach((val, i) => this.char[i] = val); //It takes too long
  }

  /**
   * Parse the buffer by uchar type and return the parsed javascript array
   * @returns {int[]}
   */
  get ucharArray() {
    return this.toArray(Uint8Array);
  }

  /**
   * Parse array by uchar type and fill buffer
   * @param {array} array
   */
  set ucharArray(array) {
    if (array.length !== this.buffer.length) this.alloc(array.length);

    array.forEach((val, i) => this.buffer.writeUInt8(val, i));
  }

  /**
   * Parse the buffer by short type and return the parsed javascript array
   * @returns {int[]}
   */
  get shortArray() {
    return this.toArray(Int16Array);
  }

  /**
   * Parse array by short type and fill buffer
   * @param {array} array
   */
  set shortArray(array) {
    if (array.length * 2 !== this.buffer.length) this.alloc(array.length * 2);

    array.forEach((val, i) => this.buffer.writeInt16LE(val, i * 2));
  }

  /**
   * Parse the buffer by ushort type and return the parsed javascript array
   * @returns {int[]}
   */
  get ushortArray() {
    return this.toArray(Uint16Array);
  }

  /**
   * Parse array by ushort type and fill buffer
   * @param {array} array
   */
  set ushortArray(array) {
    if (array.length * 2 !== this.buffer.length) this.alloc(array.length * 2);

    array.forEach((val, i) => this.buffer.writeUInt16LE(val, i * 2));
  }

  /**
   * Parse the buffer by int type and return the parsed javascript array
   * @returns {int[]}
   */
  get intArray() {
    return this.toArray(Int32Array);
  }

  /**
   * Parse array by int type and fill buffer
   * @param {array} array
   */
  set intArray(array) {
    if (array.length * 4 !== this.buffer.length) this.alloc(array.length * 4);

    array.forEach((val, i) => this.buffer.writeInt32LE(val, i * 4));
  }

  /**
   * Parse the buffer by uint type and return the parsed javascript array
   * @returns {int[]}
   */
  get uintArray() {
    return this.toArray(Uint32Array);
  }

  /**
   * Parse array by uint type and fill buffer
   * @param {array} array
   */
  set uintArray(array) {
    if (array.length * 4 !== this.buffer.length) this.alloc(array.length * 4);

    array.forEach((val, i) => this.buffer.writeUInt32LE(val, i * 4));
  }

  /**
   * Parse the buffer by float type and return the parsed javascript array
   * @returns {float[]}
   */
  get floatArray() {
    return this.toArray(Float32Array);
  }

  /**
   * Parse array by float type and fill buffer
   * @param {array} array
   */
  set floatArray(array) {
    if (array.length * 4 !== this.buffer.length) this.alloc(array.length * 4);

    array.forEach((val, i) => this.buffer.writeFloatLE(val, i * 4));
  }

  /**
   * Parse the buffer by double type and return the parsed javascript array
   * @returns {float[]}
   */
  get doubleArray() {
    return this.toArray(Float64Array);
  }

  /**
   * Parse array by double type and fill buffer
   * @param {array} array
   */
  set doubleArray(array) {
    if (array.length * 8 !== this.buffer.length) this.alloc(array.length * 8);

    array.forEach((val, i) => this.buffer.writeDoubleLE(val, i * 8));
  }

  /**
   * Get the array according to the javascript basic data type
   * @param {TypedArray} TypeArray TypeArray
   * @returns {array}
   */
  toArray(TypeArray) {
    const length = Math.floor(this.buffer.byteLength / TypeArray.BYTES_PER_ELEMENT);
    return Array.from(new TypeArray(this.buffer.buffer, this.buffer.byteOffset, length));
  }

  /**
   * Copies data from a Buffer or TypedArray or DataView. **The memory address maybe updated**
   * @param {Buffer|TypedArray|DataView|number} data Initialize data
   * @param {number} [size] The default size is - 1, and the copy is equal to the length of this buffer
   * @param {boolean} [deepCopy]
   */
  from(data, size = -1, deepCopy = false) {
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
   * @param {number} [val] Default: 0.
   */
  set(val = 0) {
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
   * @param {number} [size] Defalut: 0
   */
  alloc(size = 0) {
    if (size < 0) size = 0;
    if (this.buffer.length === size) return;
    if (!size) return this.allocEmpty();

    this.buffer = Buffer.alloc(size);
    this.ptrVal = ref.address(this.buffer);
    this.ptr = this.buffer.reinterpret(1, 0);
  }

}