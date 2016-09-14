(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],2:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":1,"ieee754":10}],3:[function(require,module,exports){
var Buffer = require('buffer').Buffer;
var intSize = 4;
var zeroBuffer = new Buffer(intSize); zeroBuffer.fill(0);
var chrsz = 8;

function toArray(buf, bigEndian) {
  if ((buf.length % intSize) !== 0) {
    var len = buf.length + (intSize - (buf.length % intSize));
    buf = Buffer.concat([buf, zeroBuffer], len);
  }

  var arr = [];
  var fn = bigEndian ? buf.readInt32BE : buf.readInt32LE;
  for (var i = 0; i < buf.length; i += intSize) {
    arr.push(fn.call(buf, i));
  }
  return arr;
}

function toBuffer(arr, size, bigEndian) {
  var buf = new Buffer(size);
  var fn = bigEndian ? buf.writeInt32BE : buf.writeInt32LE;
  for (var i = 0; i < arr.length; i++) {
    fn.call(buf, arr[i], i * 4, true);
  }
  return buf;
}

function hash(buf, fn, hashSize, bigEndian) {
  if (!Buffer.isBuffer(buf)) buf = new Buffer(buf);
  var arr = fn(toArray(buf, bigEndian), buf.length * chrsz);
  return toBuffer(arr, hashSize, bigEndian);
}

module.exports = { hash: hash };

},{"buffer":2}],4:[function(require,module,exports){
var Buffer = require('buffer').Buffer
var sha = require('./sha')
var sha256 = require('./sha256')
var rng = require('./rng')
var md5 = require('./md5')

var algorithms = {
  sha1: sha,
  sha256: sha256,
  md5: md5
}

var blocksize = 64
var zeroBuffer = new Buffer(blocksize); zeroBuffer.fill(0)
function hmac(fn, key, data) {
  if(!Buffer.isBuffer(key)) key = new Buffer(key)
  if(!Buffer.isBuffer(data)) data = new Buffer(data)

  if(key.length > blocksize) {
    key = fn(key)
  } else if(key.length < blocksize) {
    key = Buffer.concat([key, zeroBuffer], blocksize)
  }

  var ipad = new Buffer(blocksize), opad = new Buffer(blocksize)
  for(var i = 0; i < blocksize; i++) {
    ipad[i] = key[i] ^ 0x36
    opad[i] = key[i] ^ 0x5C
  }

  var hash = fn(Buffer.concat([ipad, data]))
  return fn(Buffer.concat([opad, hash]))
}

function hash(alg, key) {
  alg = alg || 'sha1'
  var fn = algorithms[alg]
  var bufs = []
  var length = 0
  if(!fn) error('algorithm:', alg, 'is not yet supported')
  return {
    update: function (data) {
      if(!Buffer.isBuffer(data)) data = new Buffer(data)
        
      bufs.push(data)
      length += data.length
      return this
    },
    digest: function (enc) {
      var buf = Buffer.concat(bufs)
      var r = key ? hmac(fn, key, buf) : fn(buf)
      bufs = null
      return enc ? r.toString(enc) : r
    }
  }
}

function error () {
  var m = [].slice.call(arguments).join(' ')
  throw new Error([
    m,
    'we accept pull requests',
    'http://github.com/dominictarr/crypto-browserify'
    ].join('\n'))
}

exports.createHash = function (alg) { return hash(alg) }
exports.createHmac = function (alg, key) { return hash(alg, key) }
exports.randomBytes = function(size, callback) {
  if (callback && callback.call) {
    try {
      callback.call(this, undefined, new Buffer(rng(size)))
    } catch (err) { callback(err) }
  } else {
    return new Buffer(rng(size))
  }
}

function each(a, f) {
  for(var i in a)
    f(a[i], i)
}

// the least I can do is make error messages for the rest of the node.js/crypto api.
each(['createCredentials'
, 'createCipher'
, 'createCipheriv'
, 'createDecipher'
, 'createDecipheriv'
, 'createSign'
, 'createVerify'
, 'createDiffieHellman'
, 'pbkdf2'], function (name) {
  exports[name] = function () {
    error('sorry,', name, 'is not implemented yet')
  }
})

},{"./md5":5,"./rng":6,"./sha":7,"./sha256":8,"buffer":2}],5:[function(require,module,exports){
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

var helpers = require('./helpers');

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5_vm_test()
{
  return hex_md5("abc") == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length
 */
function core_md5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);

}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t)
{
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t)
{
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t)
{
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t)
{
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

module.exports = function md5(buf) {
  return helpers.hash(buf, core_md5, 16);
};

},{"./helpers":3}],6:[function(require,module,exports){
// Original code adapted from Robert Kieffer.
// details at https://github.com/broofa/node-uuid
(function() {
  var _global = this;

  var mathRNG, whatwgRNG;

  // NOTE: Math.random() does not guarantee "cryptographic quality"
  mathRNG = function(size) {
    var bytes = new Array(size);
    var r;

    for (var i = 0, r; i < size; i++) {
      if ((i & 0x03) == 0) r = Math.random() * 0x100000000;
      bytes[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return bytes;
  }

  if (_global.crypto && crypto.getRandomValues) {
    whatwgRNG = function(size) {
      var bytes = new Uint8Array(size);
      crypto.getRandomValues(bytes);
      return bytes;
    }
  }

  module.exports = whatwgRNG || mathRNG;

}())

},{}],7:[function(require,module,exports){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

var helpers = require('./helpers');

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    var olde = e;

    for(var j = 0; j < 80; j++)
    {
      if(j < 16) w[j] = x[i + j];
      else w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
      var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
                       safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return Array(a, b, c, d, e);

}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
  if(t < 20) return (b & c) | ((~b) & d);
  if(t < 40) return b ^ c ^ d;
  if(t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
         (t < 60) ? -1894007588 : -899497514;
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

module.exports = function sha1(buf) {
  return helpers.hash(buf, core_sha1, 20, true);
};

},{"./helpers":3}],8:[function(require,module,exports){

/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var helpers = require('./helpers');

var safe_add = function(x, y) {
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
};

var S = function(X, n) {
  return (X >>> n) | (X << (32 - n));
};

var R = function(X, n) {
  return (X >>> n);
};

var Ch = function(x, y, z) {
  return ((x & y) ^ ((~x) & z));
};

var Maj = function(x, y, z) {
  return ((x & y) ^ (x & z) ^ (y & z));
};

var Sigma0256 = function(x) {
  return (S(x, 2) ^ S(x, 13) ^ S(x, 22));
};

var Sigma1256 = function(x) {
  return (S(x, 6) ^ S(x, 11) ^ S(x, 25));
};

var Gamma0256 = function(x) {
  return (S(x, 7) ^ S(x, 18) ^ R(x, 3));
};

var Gamma1256 = function(x) {
  return (S(x, 17) ^ S(x, 19) ^ R(x, 10));
};

var core_sha256 = function(m, l) {
  var K = new Array(0x428A2F98,0x71374491,0xB5C0FBCF,0xE9B5DBA5,0x3956C25B,0x59F111F1,0x923F82A4,0xAB1C5ED5,0xD807AA98,0x12835B01,0x243185BE,0x550C7DC3,0x72BE5D74,0x80DEB1FE,0x9BDC06A7,0xC19BF174,0xE49B69C1,0xEFBE4786,0xFC19DC6,0x240CA1CC,0x2DE92C6F,0x4A7484AA,0x5CB0A9DC,0x76F988DA,0x983E5152,0xA831C66D,0xB00327C8,0xBF597FC7,0xC6E00BF3,0xD5A79147,0x6CA6351,0x14292967,0x27B70A85,0x2E1B2138,0x4D2C6DFC,0x53380D13,0x650A7354,0x766A0ABB,0x81C2C92E,0x92722C85,0xA2BFE8A1,0xA81A664B,0xC24B8B70,0xC76C51A3,0xD192E819,0xD6990624,0xF40E3585,0x106AA070,0x19A4C116,0x1E376C08,0x2748774C,0x34B0BCB5,0x391C0CB3,0x4ED8AA4A,0x5B9CCA4F,0x682E6FF3,0x748F82EE,0x78A5636F,0x84C87814,0x8CC70208,0x90BEFFFA,0xA4506CEB,0xBEF9A3F7,0xC67178F2);
  var HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);
    var W = new Array(64);
    var a, b, c, d, e, f, g, h, i, j;
    var T1, T2;
  /* append padding */
  m[l >> 5] |= 0x80 << (24 - l % 32);
  m[((l + 64 >> 9) << 4) + 15] = l;
  for (var i = 0; i < m.length; i += 16) {
    a = HASH[0]; b = HASH[1]; c = HASH[2]; d = HASH[3]; e = HASH[4]; f = HASH[5]; g = HASH[6]; h = HASH[7];
    for (var j = 0; j < 64; j++) {
      if (j < 16) {
        W[j] = m[j + i];
      } else {
        W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
      }
      T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
      T2 = safe_add(Sigma0256(a), Maj(a, b, c));
      h = g; g = f; f = e; e = safe_add(d, T1); d = c; c = b; b = a; a = safe_add(T1, T2);
    }
    HASH[0] = safe_add(a, HASH[0]); HASH[1] = safe_add(b, HASH[1]); HASH[2] = safe_add(c, HASH[2]); HASH[3] = safe_add(d, HASH[3]);
    HASH[4] = safe_add(e, HASH[4]); HASH[5] = safe_add(f, HASH[5]); HASH[6] = safe_add(g, HASH[6]); HASH[7] = safe_add(h, HASH[7]);
  }
  return HASH;
};

module.exports = function sha256(buf) {
  return helpers.hash(buf, core_sha256, 32, true);
};

},{"./helpers":3}],9:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],10:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],11:[function(require,module,exports){
module.exports = {};
},{}],12:[function(require,module,exports){
module.exports=require(11)
},{}],13:[function(require,module,exports){
const Comment = require("./comment");

module.exports = function(sender_id, receiver_id){
	Comment.call(this);
	this.setSender = function(id){
		this.data.sender = ("number" === typeof id) ? id : Number(id);
	};
	this.setReceiver = function(id){
		this.data.receiver = ("number" === typeof id) ? id : Number(id);
	};

	this.constructor = function(sender, receiver){
		this.setSender(sender);
		this.setReceiver(receiver);
		return this;
	};

	return this.constructor(sender_id, receiver_id);
};
},{"./comment":14}],14:[function(require,module,exports){
const Common = require("./common");
module.exports = function(user_id){
	Common.call(this, user_id);
	this.done = function(){
		this.set("text", this.getText(this.get("text")));
		return !!(this.get("text")||this.get("file")||this.get("html"));
	};
};
},{"./common":15}],15:[function(require,module,exports){
module.exports = function(user_id){
	this.size = {
		image: 2097152,
		audio: 20971520,
		video: 209715200
	};
	this.data = { user: user_id };

	this.set = function(key, value){
		if(value) this.data[key] = value;
		return this;
	};
	this.has = function(key){
		return !!this.data[key];
	};
	this.get = function(key){
		return this.data[key];
	};
	this.remove = function(key){
		delete this.data[key];
		return this;
	};
	this.getText = function(text){
		if(text) return text.replace(/^[\n\r\t\s]+/g, "").replace(/[\n\r\t\s]+$/g, "").replace(/[\n\r\t]{2,}/g, "\n\n").replace(/\n{1}/g, "\n");
	};
};
},{}],16:[function(require,module,exports){
const map_role = ["people", "friend", "me"];
const map_type = ["audio", "image", "video", "post"];
const Common = require("./common");

module.exports = function(user_id){
	Common.call(this);
	this.data.role = 0;
	this.data.type = 0;
	this.data.content = {file: [], user: {}}; /* user is people tag: user: {"1": { id, name, avatar } } */
	this.data.user = [];

	this.list_user = {};
	this.list_file = {};

	this.file_uploading = 0;
	this.file_uploaded = 0;

	this.addRole = function(role){
		var index = map_role.indexOf(role);
		if(index >= 0) this.data.role = index;
	};
	this.addHTML = function(info){
		/**
		 * info: { title, description, site, url, image|video|audio }
		 */
		if(!this.countFile()) this.data.content.html = info;
	};
	this.hasFile = function(name){
		return !!this.list_file[name];
	};
	this.addFile = function(name, data){
		this.list_file[name] = data;
	};
	this.setFile = function(name, key, value){
		this.list_file[name][key] = value;
	};
	this.countFile = function(){
		return Object.keys(this.list_file).length;
	};
	this.removeFile = function(name){
		delete this.list_file[name];
	};
	this.customFile = function(){
		for(var i in this.list_file){
			this.data.content.file.push(this.list_file[i]);
		}
	};
	
	this.addTag = function(id, data){
		this.data.content.user[id] = data;
	};
	this.removeTag = function(id){
		delete this.data.content.user[id];
	};

	this.addUser = function(id, data){
		if(this.list_user[id]) return this;
		this.list_user[id] = data;
		this.data.user.push(id);
	};
	this.removeUser = function(id){
		var index = this.data.user.indexOf(id);
		if(-1 === index) return this;
		delete this.list_user[id];
		this.data.user.splice(index, 1);
	};
	this.getData = function(){
		if(this.countFile()) this.customFile();
		this.addUser(user.id, user.data);
		this.addRole(this.get("role"));
		this.set("text", this.getText(this.get("text")));
		return this.data;
	};

	this.done = function(){
		var count_file = this.countFile();
		if(count_file && this.file_uploaded!==this.file_uploading) return false;
		if(!(count_file||this.data.content.text||this.data.html)) return false;
		return true;
	};
};
},{"./common":15}],17:[function(require,module,exports){
module.exports = function(array, time){
	for(var i = 0, n = array.length; i < n; i++){
		setTimeout("function"===typeof(array[i]) ? array[i] : function(){ return array[i] }, time);
	}
};
},{}],18:[function(require,module,exports){
String.prototype.toArray = function(){ return JSON.parse(this) };

const SET = require("../cache/set");
const HSET = require("../cache/hset");

module.exports = {
	set: function(key, value){
		SET[key] = value;
		return this;
	},
	mset: function(list){ /* multi set */
		for(var key in list) this.set(key, list[key]);
	},
	get: function(key){
		return SET[key];
	},
	has: function(key){
		return !!SET[key];
	},
	del: function(key){
		delete SET[key];
		return this;
	},

	hset: function(hash, key, value){
		if(!HSET[hash]) HSET[hash] = {};
		HSET[hash][key] = value;
		return this;
	},
	hmset: function(hash, list){ /* multi hash set */
		if(!HSET[hash]) HSET[hash] = {};
		for(var key in list) HSET[hash][key] = list[key];
		return this;
	},
	hget: function(hash, key){
		if(value = HSET[hash]) return value[key];
		else return null;
	},
	hgetall: function(hash){
		return HSET[hash]||null;
	},
	hdel: function(hash, key){
		if(key && HSET[hash]) delete HSET[hash][key];
		else delete HSET[hash];
		return this;
	},

	is: function(hash, key, value){
		if(value) return value===this.hget(hash, key);
		else return key===this.get(hash);
	},

	setLocal: function(key, value){
		window.localStorage.setItem(key, ("string"===typeof value)?value:JSON.stringify(value));
		return this;
	},
	getLocal: function(key){
		return window.localStorage.getItem(key);
	},
	removeLocal: function(key){
		window.localStorage.removeItem(key);
		return this;
	}
};
},{"../cache/hset":11,"../cache/set":12}],19:[function(require,module,exports){
var hash = require("./hash");
module.exports = function(list_user){
	return hash.md5(list_user.join("").split("").sort().join(""));
};
},{"./hash":26}],20:[function(require,module,exports){
function parseCookie(){
	var it = document.cookie, array = [], data = {};
	if(it){
		it = it.replace(/(\n|\r|\t|\s)+/g, "").split(";");
		for(var i=0, n=it.length; i<n; i++){
			array = it[i].split("=");
			data[decodeURIComponent(array[0])] = decodeURIComponent(array[1]);
		}
	}
	return data
}

function Cookie(){
	this.data = parseCookie();
	this.define = "";
}

Cookie.prototype.init = function(set){
	var date = new Date(), time = set.day||1;
	date.setTime(date.getTime() + (time*24*3600000));

	var array = ["expires="+date.toUTCString(), "path="+(set.path||"/")];
	if(set.host) array.push("domain="+set.host);
	if(set.secure) array.push("secure="+set.secure);

	this.define = array.join(";");
	return this;
}

Cookie.prototype.set = function(array){
	for(var i in array){ 
		document.cookie = encodeURIComponent(i) + "=" + encodeURIComponent(array[i]) + ";" + this.define;
		this.data[i] = array[i];
	}
}

Cookie.prototype.has = function(name){
	return !!this.data[decodeURIComponent(name)];
}

Cookie.prototype.get = function(name){
	return this.data[decodeURIComponent(name)];
}

Cookie.prototype.remove = function(array){
	if(!this.define) this.init({day: -365, path: "/"});
	for(var i=0, n=array.length; i<n; i++) {
		document.cookie = decodeURIComponent(array[i])+"=;"+this.define;
		delete this.data[array[i]];
	}
}

module.exports = new Cookie();
},{}],21:[function(require,module,exports){
module.exports = function(option){
    var a = document.createElement("a"), 
        x = new XMLHttpRequest(),
        type = option.type||"get",
        data = option.data,
        header = { "X-Requested-With": "XMLHttpRequest" },
        upload = !!option.progress
    ;
    function progress(e){ option.progress((e.loaded / e.total) * 100) }

    // set url 
    a.href = option.url;
    
    // set data 
    if("get"===type){
        var $data = [];
        for(var i in data) {
            $data.push(encodeURIComponent(i)+"="+encodeURIComponent(data[i]));
        };
        data = $data.join("&");
        a.search = a.search ? (a.search + "&" + data) : data;
        data = null;
    }
    if(!upload){
        header["Content-Type"] = "application/json";
        data = JSON.stringify(data);
    }
    
    // open request 
    x.open(type, a.href, true);

    // ajax error 
    if(option.error) x.addEventListener("error", option.error);

    // response data 
    if(option.success){
        function success(){
            if(x.readyState==4&&x.status==200&&x.response) option.success(JSON.parse(x.response));
            if(upload) x.upload.removeEventListener("progress", progress);
        };
        x.addEventListener("readystatechange", success);
    }

    // using progress upload 
    if(upload) {
        x.upload.addEventListener("progress", progress);
        header["Content-Type"] = "application/octet-stream";
        header["Cache-Control"] = "no-cache";
    }

    // send header 
    for(var i in header){ x.setRequestHeader(i, header[i]) }

    // send data 
    x.send(data)
}
},{}],22:[function(require,module,exports){
var Node = require("./node");
var Ajax = require("./ajax");
var Query = require("./query");

function DOM(s){
    if(s.render){
        var node = new Node(s);
        return new Query(node.dom);
    }else return new Query(s);
}

DOM.ajax = function(option){
	return new Ajax(option);
}

module.exports = DOM;
},{"./ajax":21,"./node":23,"./query":24}],23:[function(require,module,exports){
var Query = require('./query');
var Emitter = require("events").EventEmitter;

function Node(object){
    this.e = new Emitter();
    this.ref = {};
    this.controller = {};
    for(var i in object){
        if('render'===i) continue;
        this[i] = object[i];
    };
    this.dom = object.render.bind(this)();
    this.dom.e = this.e;
    this.dom.childNode = this.ref;
    this.dom.controller = this.controller;
}

Node.prototype.n = function(nodeName, array){
    var dom = document.createElement(nodeName);
    var attributes = array[0];
    if(attributes){
        if('object'===typeof attributes){
            if(attributes.node){ 
                this.ref[attributes.node] = dom; 
                delete attributes.node;
            };
            if(attributes.controller){
                var name = attributes.controller;
                this.e.on(name, this.controller[name].bind(new Query(dom)));
                delete attributes.controller;
            };
            for(var attr in attributes){ 
                if('object'===typeof attributes[attr]){
                    for(var i in attributes[attr]) dom[attr][i] = attributes[attr][i]
                }else{
                    dom[attr] = attributes[attr]
                }
            };
        }else{
            dom.innerHTML = attributes;
        }
    };
    if(array[1]){
        for(var i=1, n=array.length; i<n; i++){
            switch(typeof array[i]){
                case 'function': array[i](new Query(dom)); break;
                case 'object': dom.appendChild(array[i].s||array[i]); break;
                default: dom.insertAdjacentHTML('beforeend', array[i]);
            }
        }
    };
    return dom;
}

Node.prototype.form = function(){
    if(arguments[0].file) arguments[0].enctype = 'multipart/form-data';
    return this.n('form', arguments);
}

Node.prototype.button = function(){
    arguments[0].type = 'button';
    return this.n('button', arguments);
}

Node.prototype.submit = function(){
    arguments[0].type = 'submit';
    return this.n('button', arguments);
}

Node.prototype.input = function(){
    if(!arguments[0].type) arguments[0].type = 'text';
    return this.n('input', arguments);
}

Node.prototype.text = function(){
    if(!arguments[0]) arguments[0] = {};
    arguments[0].contentEditable = true;
    return this.n('div', arguments);
}

Node.prototype.textarea = function(){
    return this.n('textarea', arguments);
}

Node.prototype.file = function(evt, multiple){
    var attribute = {type: 'file'};
    if(multiple) attribute.multiple = 1;
    if(evt) attribute.onchange = evt;
    return this.n('input', [attribute]);
}

Node.prototype.pass = function(placeholder, show){
    return this.input({
        type: show?'text':'password',
        name: 'pass',
        className: 'form-control',
        placeholder: placeholder
    });
}

Node.prototype.email = function(placeholder){
    return this.input({
        className: 'form-control', 
        name: 'email', 
        placeholder: placeholder, 
        maxLength: 100
    });
}

Node.prototype.select = function(name, option){
    if(!option) option = name;
    var list_option = [];
    for(var value in option){
        list_option.push('<option value="'+value+'">'+option[value]+'</option>');
    };
    return this.n('select', [{name: name}, list_option.join('')]);
}

Node.prototype.label = function(name, text){
    if('string'===typeof name){
        if(text){
            return this.n('label', [{htmlFor: name}, text]);
        }else{
            return this.n('label', [text]);
        }
    }else return this.n('label', arguments);
}

Node.prototype.error = function(){
    switch(typeof arguments[0]){
        case 'undefined': return this.n('div', [{className: 'error'}]);
        case 'string': return this.n('div', [{className: 'error', node: arguments[0]}], arguments[1]||'');
        default:
            arguments[0].className = 'error';
            return this.n('div', arguments);
    }
}

Node.prototype.a = function(){
    return this.n('a', arguments);
}

Node.prototype.header = function(){
    return this.n('header', arguments);
}

Node.prototype.section = function(){
    return this.n('section', arguments);
}

Node.prototype.footer = function(){
    return this.n('footer', arguments);
}

Node.prototype.span = function(){
    return this.n('span', arguments);
}

Node.prototype.div = function(){
    return this.n('div', arguments);
}

Node.prototype.canvas = function(){
    return this.n('canvas', arguments);
}

Node.prototype.img = function(attr){
    if('string'===typeof attr) return this.n('img', [{src: attr}]);
    else return this.n('img', [attr]);
}

Node.prototype.glyphicon = function(className, node){
    var span = document.createElement("span");
    span.className = "glyphicon "+className;
    span.ariaHidden = true;
    if(node) this.ref[node] = span;
    return span;
}

Node.prototype.li = function(){
    return this.n('li', arguments);
}

Node.prototype.ul = function(){
    return this.n('ul', arguments);
}

Node.prototype.video = function(){
    return this.n("video", arguments);
}

module.exports = Node;
},{"./query":24,"events":9}],24:[function(require,module,exports){
const trim = require("../trim");

function Query(s){
    switch(typeof s){
        case "object": this.s = s.s||s; break;
        case "string": 
            this.s = document.querySelector(s); 
            this.all = s;
            break;
    }
    if(this.s){
        if(!this.s.childNode) this.s.childNode = {};
        if(!this.s.controller) this.s.controller = {};
        this.e = this.s.e||null;
    }
}

Query.prototype.each = function(fn){
    Array.prototype.forEach.call(document.querySelectorAll(this.all), function(dom){ fn(new Query(dom)) });
}

Query.prototype.focus = function(){
    this.s.focus();
    return this;
}

Query.prototype.click = function(){
    this.s.click();
    return this;
}

Query.prototype.html = function(a){
    switch(typeof a){
        case "undefined": return trim(this.s.innerHTML);
        case "object":
            this.s.innerHTML = "";
            this.append(a);
            return this;
        default:
            this.s.innerHTML = a.toString();
            return this;
    }
}

Query.prototype.appendTo = function(parent){
    return $(parent).append(this.s);
}

Query.prototype.append = function(children){
    if("string"===typeof children) this.s.insertAdjacentHTML("beforeend", children);
    else this.s.appendChild(children.s||children);
    return this;
}

Query.prototype.prepend = function(children){
    if("string"===typeof children) this.s.insertAdjacentHTML("afterbegin", children);
    else this.s.insertBefore(children.s||children, this.s.childNodes[0]);
    return this;
}

Query.prototype.replace = function(oldElement, newElement){
    this.s.replaceChild(newElement.s||newElement, oldElement.s||oldElement);
    return this;
}

Query.prototype.insertBefore = function(currentNode){
    /** 
     *  parent.insertBefore(newNode, currentNode);
     *
     *  => use: $(newNode).insertBefore(currentNode);
     */
    (currentNode.s||currentNode).parentNode.insertBefore(this.s, currentNode.s||currentNode);
    return this;
}

Query.prototype.insertAfter = function(currentNode){
    (currentNode.s||currentNode).parentNode.insertBefore(this.s, (currentNode.s||currentNode).nextSibling);
    return this;
}

Query.prototype.data = function(name, value){
    switch(typeof name){
        case "string":
            if("undefined"===typeof value) return this.s.dataset[name];
            else this.s.dataset[name] = value;
            return this;
        case "object":
            for(var i in name) this.s.dataset[i] = name[i];
            return this;
        default: return this.s.dataset;
    }
}

Query.prototype.empty = function(){
    this.s.value = "";
    return this;
}

Query.prototype.val = function(a){
    if("undefined"!==typeof a) this.s.value = a.toString();
    else return trim(this.s.value);
    return this;
}

Query.prototype.text = function(a){
    if("undefined"!==typeof a) this.s.innerText = a.toString();
    else return this.s.innerText;
    return this;
}

Query.prototype.css = function(a, b){
    if(b) this.s.style[a] = b;
    else{
        if("string"===typeof a) return this.s.style[a];
        else for(var i in a) this.s.style[i]=a[i];
    };
    return this;
}

Query.prototype.width = function(a){
    switch(typeof a){
        case "string": this.s.style.width = a; break;
        case "number": this.s.style.width = a+"px"; break;
        default: return this.s.clientWidth;
    };
    return this;
}

Query.prototype.height = function(a){
    switch(typeof a){
        case "string": this.s.style.height = a; break;
        case "number": this.s.style.height = a+"px"; break;
        default: return this.s.clientHeight;
    };
    return this;
}

Query.prototype.attr = function(a, b){
    if(b) this.s.setAttribute(a, b);
    else{
        if("string"===typeof a) return this.s.getAttribute(a);
        else for(var i in a) this.s.setAttribute(i, a[i]);
    };
    return this;
}

Query.prototype.removeAttr = function(a){
    this.s.removeAttribute(a);
    return this;
}

Query.prototype.hidden = function(value){
    this.s.hidden = value;
    return this;
}

Query.prototype.show = function(){
    this.s.hidden = false;
    this.s.style.display = "";
    return this;
}

Query.prototype.hide = function(){
    this.s.hidden = true;
    this.s.style.display = "none";
   return this;
}

Query.prototype.toggle = function(){
    var hidden = !this.s.hidden;
    this.s.hidden = hidden;
    this.s.style.display = hidden ? "none" : "";
    return this;
}

Query.prototype.hasClass = function(className){
    return this.s.classList.constant(className);
}

Query.prototype.addClass = function(className){
    this.s.classList.add(className);
    return this;
}

Query.prototype.removeClass = function(className){
    this.s.classList.remove(className);
    return this;
}

Query.prototype.changeClass = function(oldClass, newClass){
    this.s.classList.remove(oldClass);
    this.s.classList.add(newClass);
    return this;
}

Query.prototype.disabled = function(){
    return this.s.disabled;
}

Query.prototype.disable = function(value){
    this.s.disabled = value;
    return this;
}

Query.prototype.checked = function(){
    return this.s.checked;
}

Query.prototype.check = function(value){
    this.s.checked = value;
    return this;
}

Query.prototype.selected = function(){
    return this.s.selected;
}

Query.prototype.select = function(value){
    this.s.selected = value;
    return this;
}

Query.prototype.parent = function(parentNode){
    var node = null;
    if("string" === typeof parentNode) return (node = this.s.closest(parentNode)) ? new Query(node) : false;
    else return new Query(this.s.parentElement);
}

Query.prototype.children = function(childNode){
    if(!this.s.childNode[childNode]){
        if("number"===typeof childNode) this.s.childNode[childNode] = this.s.childNodes[childNode];
        else this.s.childNode[childNode] = this.s.querySelector(childNode);
    };
    var node = this.s.childNode[childNode];
    return node ? new Query(node) : false;
}

Query.prototype.find = function(childNode){
    var node = "number"===typeof childNode ? this.s.childNodes[childNode] : this.s.querySelector(childNode);
    return node ? new Query(node) : false;
}

Query.prototype.setChild = function(name, dom){
    this.s.childNode[name] = dom;
    return this;
}

Query.prototype.child = function(s){
    return ("number"===typeof s) ? this.s.childNodes[s] : this.s.querySelector(s);
}

Query.prototype.lastChild = function(){
    return new Query(this.s.lastChild);
}

Query.prototype.firstChild = function(){
    return new Query(this.s.firstChild);
}

Query.prototype.next = function(){
    return new Query(this.s.nextSibling);
}

Query.prototype.prev = function(){
    return new Query(this.s.previousSibling);
}

Query.prototype.remove = function(childNode){
    if(childNode){
        this.children(childNode).remove();
        delete this.s.childNode[childNode];
    }else this.s.remove();
    return this;
}

Query.prototype.set = function(key, value){
    this.s.controller[key] = value;
    return this;
}

Query.prototype.unset = function(keys){
    for(var i=0, n=keys.length; i<n; i++) {
        delete this.s.controller[keys[i]];
    };
    return this;
}

Query.prototype.reset = function(){
    for(var i in this.s.controller) {
        if("function"===typeof this.s.controller[i]) continue;
        delete this.s.controller[i];
    };
    return this;
}

Query.prototype.incrby = function(key, number){
    var count = this.s.controller[key]||0, value = number||1, plus = count+value;
    this.s.controller[key] = plus;
    return plus;
}

Query.prototype.get = function(key){
    return this.s.controller[key];
}

Query.prototype.call = function(fn){
    if(arguments.length>1){
        var fn = arguments[0]; delete arguments[0];
        var array = [];
        for(var i in arguments) array.push(arguments[i]);
        var data = this.s.controller[fn].apply([], array);
    }else{
        var data = this.s.controller[fn]();
    };
    return data||this;
}

Query.prototype.emit = function(name, value){
    if(this.e) this.e.emit(name, value);
    return this;
}

Query.prototype.on = function(name, cb){
    this.e.on(name, cb);
}

module.exports = Query;
},{"../trim":30}],25:[function(require,module,exports){
module.exports = function getUserMedia(constraints){
	var user_media = navigator.getUserMedia||navigator.webkitGetUserMedia||navigator.msGetUserMedia;
	if(user_media) return new Promise(function(resolve, reject){ user_media.call(navigator, constraints, resolve, reject) });
	else return navigator.mediaDevices.getUserMedia(constraints);
}
},{}],26:[function(require,module,exports){
const Crypto = require("crypto");
const saltChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const saltCharsCount = saltChars.length;

function generateSalt(len) {
  if (typeof len != 'number' || len <= 0 || len !== parseInt(len, 10)) throw new Error('Invalid salt length');
  if (Crypto.randomBytes) {
    return Crypto.randomBytes(Math.ceil(len / 2)).toString('hex').substring(0, len);
  } else {
    for (var i = 0, salt = ''; i < len; i++) {
      salt += saltChars.charAt(Math.floor(Math.random() * saltCharsCount));
    }
    return salt;
  }
}

function generateHash(algorithm, salt, password, iterations) {
  iterations = iterations || 1;
  try {
    var hash = password;
    for(var i=0; i<iterations; ++i) {
      hash = Crypto.createHmac(algorithm, salt).update(hash).digest('hex');
    }
    
    return algorithm + '$' + salt + '$' + iterations + '$' + hash;
  } catch (e) {
    throw new Error('Invalid message digest algorithm');
  }
}

function makeBackwardCompatible(hashedPassword) {
  var parts = hashedPassword.split('$');
  if(parts.length === 3) {
    parts.splice(2,0,1);
    hashedPassword = parts.join("$");
  }
  
  return hashedPassword;
}

module.exports.generate = function(password, options) {
  if (typeof password != 'string') throw new Error('Invalid password');
  options || (options = {});
  options.algorithm || (options.algorithm = 'sha1');
  options.saltLength || options.saltLength == 0 || (options.saltLength = 8);
  options.iterations || (options.iterations = 1);
  var salt = generateSalt(options.saltLength);
  return generateHash(options.algorithm, salt, password, options.iterations);
};

module.exports.verify = function(password, hashedPassword) {
  if (!password || !hashedPassword) return false;
  hashedPassword = makeBackwardCompatible(hashedPassword);
  var parts = hashedPassword.split('$');
  if (parts.length != 4) return false;
  try {
    return generateHash(parts[0], parts[1], password, parts[2]) == hashedPassword;
  } catch (e) {}
  return false;
};

module.exports.sha1 = function(text){
  return Crypto.createHash('sha1').update(text).digest("hex"); /* 40 char */
};

module.exports.md5 = function(text){
  return Crypto.createHash('md5').update(text).digest("hex"); /* 32 char */
};
},{"crypto":4}],27:[function(require,module,exports){
const method = ["get", "put", "post", "delete", "patch"];
const trim = require("./trim");

module.exports = {
	_error: {},
	error: 0,
	start: function(){
		this.error = 0;
	},
	set: function(key, value){
		this._error[key] = value;
		return false;
	},
	get: function(key){
		this.error++;
		return this._error[key];
	},
	id: function(value){
		return ("number"===typeof value && value > 0);
	},
	index: function(value){
		return ("number"===typeof value && value >= -1);
	},
	number: function(value){
		return ("number"===typeof value && value >= 0);
	},
	string: function(value){
		return ("string"===typeof value);
	},
	empty: function(value){
		return !value;
	},
	boolean: function(value){
		return ("boolean"===typeof value);
	},
	object: function(value){
		return ("[object Object]"===value.toString());
	},
	method: function(name){
		return -1!==method[name];
	},
	token: function(token){
		return (this.string(token)&&token.length===40);
	},
	name: function (n){
		var type, name = trim(n||""), count = name.length;
		/* check length */
		if(count<2) type = "error_name_short";
		else if(count>30) type = "error_name_long";
		else{
			/* word count */
			if(name.split(" ").length>2) type = "error_name_many_word";
			else{
				/* ki tu dac biet */
				var reg = /[~`!@#\$%\^&\*\(\)_\+\-=\{\}\[\]\\:\';\'<>\?\,\.\/\|\d]+/g;
				if(reg.test(name)) type = "error_name_not_valid";
				else{
					/* ki tu in hoa */
					var locale_upper_case = name.match(/[QWERTYUIOPASDFGHJKLZXCVBNMƯỨỮỬỰAĂÂÁÀẢÃẠĂẮẰẶẴẲẤẦẨẪẬĐÊẾỀỂỄỆÍÌỈĨỊÝỲỶỸỴ]/g);
					if(locale_upper_case&&locale_upper_case.length>2) type = "error_name_many_upper";
					else return true;
				}
			}
		};
		return this.set("name", type);
	},
	gender: function(gender){
		return (gender==="male"||gender==="female") ? true : this.set("gender", "error_gender");
	},
	birthday: function(day, month, year){
		var d = Number(day), m = Number(month), y = Number(year), message = null;
		if(isNaN(d)||isNaN(m)||isNaN(y)) message = "error_birthday_not_valid";
		else if(d<0||m<1||y<1960||d>31||m>12||y>2015) message = "error_birthday_not_valid";
		else if((d===30||d===31)&&m===2) message = "error_birthday_leap_year";
		else return true;
		return this.set("birthday", message);
	},
	phone: function (phone) {
		return (/^[0-9]{9,15}$/g.test(phone)&&/^(0|\+)/.test(phone[0])) ? true : this.set("email", "error_email_input");
	},
	code: function (a) {
		return /^[0-9]{5}$/g.test(a) ? true : this.set("confirm", "error_confirm_not_valid");
	},
	pass: function (a) {
		return /(.){8,100}/g.test(a) ? true : this.set("pass", "error_pass_not_valid");
	},
	email: function (a) {
		var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/g;
		return filter.test(a) ? true : this.set("email", "error_email_input");
	},
	username: function (a) {
		return /^[a-zA-Z0-9\.]{1,50}$/gi.test(a) ? true : this.set("email", "error_email_input");
	},
	url: function (a) {
		var urlRegex = /(http|https|ftp)\:\/\/([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(\/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*/g;
		var url = urlRegex.exec(a);
		if (url && url.length) { return url[0]; } else { return false; }
	}
};
},{"./trim":30}],28:[function(require,module,exports){
function Router(){
    this.data = {};
}

Router.prototype.url = function(){
    return (window.location.pathname+window.location.search);
}

Router.prototype.set = function(re, handler){
    this.data[re] = handler;
    return this;
}

Router.prototype.parse = function(fragment){
    var match = null, array = this.data;
    for(var i in array){
        if(match = fragment.match(i)){
            match.shift();
            array[i].apply({}, match);
            return this;
        }
    };
    return this;
}

Router.prototype.redirect = function(path){
    history.pushState(null, null, path);
    return false;
}

Router.prototype.go = function(path){
    return this.parse(path).redirect(path);
}

Router.prototype.handle = function(){
    return this.go(this.url());
}

module.exports = new Router();
},{}],29:[function(require,module,exports){
module.exports = {
	fixtime: function(time){
		return time < 10 ? ("0" + time) : time;
	},
	timestring: function(date){
		var array = date.toString().split(" ");
		return [array[0], date.getDate()+"/"+(date.getMonth()+1)+"/"+array[3], "on", this.fixtime(date.getHours())+":"+this.fixtime(date.getMinutes())].join(" ");
	},
	timecountdown: function(duration, current){
		var currentTime = duration - current;
	    var curmins = parseInt(currentTime / 60);
	    var cursecs = parseInt(currentTime - curmins * 60);
	    var text = [this.fixtime(curmins), this.fixtime(cursecs)].join(':');
	    return (current===0) ? text : ((currentTime===0) ? "00:00" : ("- "+text));
	},
	timeago: function(date){
		var time = Date.now() - date.getTime();
		var sec, min, hour;
		sec = parseInt(time/1000);
		min = parseInt(sec/60);
		hour = parseInt(min/60);

		if(hour>23) {
			var timestring = this.timestring(date);
			return {text: timestring};
		};
		if(hour>1) return {text: hour+" "+lang.timeago_hours, timeout: 300000};
		if(hour>0) return {text: "1 "+lang.timeago_hour, timeout: 300000};
		if(min>1) return {text: min+" "+lang.timeago_mins, timeout: 7000};
		if(min>0) return {text: "1 "+lang.timeago_min, timeout: 7000};
		return {text: lang.timeago_now, timeout: 2000};
	}
};
},{}],30:[function(require,module,exports){
module.exports = function (str) {
	return str.replace(/^\s+/, "").replace(/\s+$/, "").replace(/\s+/g, " ");
}
},{}],31:[function(require,module,exports){
const Reply = require("./reply");

module.exports = function Comment(COMMENT){
	Reply.call(this, COMMENT);

	this.dataReply = function(user, reply, post_id, post_t){
		var comment = this;
		return {
			count_reply: comment.count("reply"),
			post_id: post_id,
			post_t: post_t,
			comment: {
				id: comment.id,
				auth: comment.auth /* send notify to this user if needed */
			},
			user: user, /* user cookie */
			reply: reply.data /* form data */
		}
	}
};
},{"./reply":34}],32:[function(require,module,exports){
const timer = require("../lib/time");
const User = require("vn/model/user");

module.exports = function Common(){
	this.$clickLike = 0;
	this.hasLike = true;
	this.iconLike = {
		like: "glyphicon-thumbs-up like"
	}
	this.getIconLike = function(option){
		return this.count(option) ? this.iconLike[option] : "hidden";
	}
	this.setId = function(id){
		this.id = parseInt(id);
	}
	this.setAuth = function(object){
		this.auth = new User(object);
	}
	this.setUser = function(user){
		this.user = user;
	}
	this.setTime = function(time){
		this.time = new Date(time);
	}
	this.getTime = function(fn){
		var time = 0, $this = this, timestamp = this.time;
		var now = timer.timeago(timestamp);

		fn(now.text);

		if(now.timeout){
			function callback(){
				time = timer.timeago(timestamp);
				fn(time.text);

				if(!time.timeout){
					clearInterval($this.timeout);
					delete $this.timeout;
				}
			};

			this.timeout = setInterval(callback, now.timeout);
		}
	}
	this.initCount = function(count){
		this.$count = {
			like: count.like||0,
			love: count.love||0,
			wow: count.wow||0,
			haha: count.haha||0,
			sad: count.sad||0,
			ungry: count.ungry||0
		}
	}
	this.setCount = function(name, value){
		this.$count[name] = value||0;
	}
	this.count = function(name){
		return this.$count[name];
	}

	this.pushCount = function(name){
		this.$count[name]++;
	}
	this.pullCount = function(name){
		this.$count[name]--;
	}
	this.countLike = function(){
		return this.count("like")+this.count("love")+this.count("wow")+this.count("haha")+this.count("sad")+this.count("ungry");
	}
	this.clickLike = function(){
		++this.$clickLike;
		return this.$clickLike;
	}
	this.unLike = function(){
		if(!this.count(this.liked)) return false;

		this.from = this.liked;
		this.liked = "";
		this.pullCount(this.from);
		this.method = "delete";
		return true;
	}
	this.Like = function(name){
		if(this.liked===name) return false;

		this.from = this.liked||"";
		this.liked = name;
		this.pushCount(this.liked);
		if(this.from) this.pullCount(this.from);
		this.method = this.hasLike ? "put" : "post";
		return true;
	}
	this.toArray = function(){
		var post = this;
		post = JSON.stringify(post);
		post = JSON.parse(post);
		delete post.$count;
		delete post.$clickLike;
		delete post.iconLike;
		return post;
	}
};
},{"../lib/time":29,"vn/model/user":35}],33:[function(require,module,exports){
const Common = require("./common");
const map_type = ["post", "image", "video", "audio", "share"];
const map_role = ["people", "friend", "me"];

module.exports = function Post(POST){
	Common.call(this);

	this.constructor = function(post){
		this.initCount(post.initCount);
		this.setCount("comment", post.count_comment);
		this.setCount("share", post.count_share);
		this.setCount("view", post.count_view);
		this.setUser(post.post_user);
		this.setContent(post.post_content);
		this.setRole(post.post_role);
		this.setType(post.post_type);
		this.setId(post.post_id);
		this.setTime(post.post_time);

		this.t = post.t;
		this.liked = post.liked;
		this.hasLike = post.hasLike;
	}
	this.setRole = function(index){
		this.role = map_role[index];
	}
	this.setType = function(index_type){
		this.type = map_type[index_type];
	}
	this.setFile = function(files){
		this.file = files;
		this.setCount("file", files.length);
	}
	this.setTitle = function(text){
		if(text) this.title = /[^\n\.!\?]+/.exec(text)[0];
	}
	this.setUser = function(user){
		this.setAuth(user[0]);
		user.splice(0, 1);
		this.setOther(user);
	}
	this.setOther = function(array){
		var i = 0, n = array.length;
		if(n){
			this.other = {};
			for(var i=0, n=array.length; i<n; i++){
				this.other[array[i].id] = new User(array[i]);
			}
		}
	}
	this.getUser = function(id){
		return this.other[id];
	}
	this.setContent = function(content){
		content = JSON.parse(content);
		this.html = content.html;
		this.feel = content.feel;
		this.text = content.text;
		this.setTitle(content.text);
		this.setFile(content.files);
	}
	this.dataLike = function(user_id){
		var post = this;
		return {
			user: user_id,
			auth: post.auth.id,
			post: post.id,
			count: {
				from: post.count(post.from)||0,
				liked: post.count(post.liked)||0
			},
			from: post.from,
			liked: post.liked,
			t: post.t,
			method: post.method
		}
	}
	this.dataComment = function(comment, user){
		var post = this;
		return {
			count_comment: post.count("comment"),
			comment: comment.data, /* model form */
			user: user, /* model database */
			post: {
				id: post.id,
				t: post.t,
				auth: post.auth,
				type: post.type
			}
		}
	}
	return this.constructor(POST);
};
},{"./common":32}],34:[function(require,module,exports){
const Common = require("./common");

module.exports = function Reply(DATA){
	Common.call(this);

	this.constructor = function(comment){
		this.$count = comment.count;

		this.setId(comment.id);
		this.setTime(comment.time);
		
		this.user = comment.user;
		this.liked = comment.likes;
		this.text = comment.text;
		this.file = comment.file;
		this.type = comment.type;
		this.html = comment.html;
	}

	this.dataLike = function(user_id, post_id, post_t){
		var comment = this;
		return {
			user: user_id,
			auth: comment.auth.id,
			post: post_id,
			comment: comment.id,
			count: {
				from: comment.count(comment.from)||0,
				liked: comment.count(comment.liked)||0
			},
			from: comment.from,
			liked: comment.liked,
			t: post_t,
			method: comment.method
		}
	}

	return this.constructor(DATA);
};
},{"./common":32}],35:[function(require,module,exports){
var cookie = require("../lib/cookie");
var hash = require("../lib/hash");

function User(data){
	this.setId(data.id);
	this.setToken(cookie.get("act"));

	this.username = data.username;
	this.fname = data.fname;
	this.lname = data.lname;
	this.gender = data.gender;
	this.avatar = data.avatar;

	this.friend = data.friend||null;

	this.url = this.username ? ("/"+this.username) : ("/profile?id="+this.id);
	this.name = this.fname+" "+this.lname;
}

User.prototype.setId = function(id){
	this.id = ("string"===typeof id) ? parseInt(id) : id;
}

User.prototype.setToken = function(time){
	this.token = hash.sha1(time||"");
}

module.exports = User;
},{"../lib/cookie":20,"../lib/hash":26}],36:[function(require,module,exports){
var $ = require("vn/lib/dom");
var cache = require("vn/lib/cache");

module.exports = function(option){
	var dom = $({
		controller: {
			remove: function(action){
				if(option.name) cache.del(option.name);
				if(action) action();
				dom.remove();
			}
		},
		yes: function(){
			dom.call("remove", option.yes);
		},
		no: function(){
			dom.call("remove", option.no);
		},
		render: function(){
			return this.div({className: "modal"},
				this.div({className: "modal-box"},
					this.div({className: "modal-content"},
						function(div){
							if(option.header) div.append(this.header(null, option.header));
							if(option.section) div.append(this.section(null, option.section));
							if(option.footer===false) return;
							div.append(this.footer(null, 
 								option.footer || 
 								this.div({className: "clearfix"},
 									this.button({className: "pull-right btn btn-primary btn-sm", onclick: this.yes}, "Yes"),
 									this.button({className: "pull-right btn btn-default btn-sm", onclick: this.no}, "No")
 								)
 							))
						}.bind(this)
					)
				)
			)
		}
	});
	return dom;
};
},{"vn/lib/cache":18,"vn/lib/dom":22}],37:[function(require,module,exports){
var $ = require("../lib/dom");
module.exports = $({
	render: function(){
		return this.div({id: "error"}, "This page not found")
	}
});
},{"../lib/dom":22}],38:[function(require,module,exports){
var $ = require("vn/lib/dom");
var chatId = require("../lib/chat-id");
var MessageBox = require("../../../private/javascript/mobile/view/message/box");
var WaitChat = require("../../../private/javascript/mobile/view/chat/waiting");
var VideoCall = require("../../../private/javascript/mobile/view/chat/video");
var body = $(document.body);

var socket = io.connect(host.chat);
socket.emit("addUser", user.id);

socket.on("chat", function(data){
	var list_chat = document.getElementById("list-chat-"+data.dom);
	var message_index = document.getElementById("message_index");
	if(list_chat) $(list_chat).emit("chat", data);
	else list_chat = MessageBox({}, {}, false);
	if(message_index) $(message_index).prepend(list_chat);
});

socket.on("is-writing-chat", function(data){
	$("#form-chat-"+data.dom).emit("is_writing_chat", data);
});

socket.on("waiting-for-call", function(data){
	var box = document.getElementById("call-chat-notify");
	if(!box){
		box = WaitChat();
		body.prepend(box);
	};
	$(box).emit("addCalling", data);
});

socket.on("video-call-accept", function(list_user){
	socket.emit("add-room-chat", list_user);
	body.prepend(VideoCall({sender: list_user[1], receiver: list_user[0], id: chatId(list_user)}));
});

socket.on("video-call", function(image){
	$("#video-calling").emit("image", image);
});

socket.on("end-calling", function(){
	alert("and call");
});

socket.on("waiting-for-call-error", function(data){
	console.log("error: ", data);
});

socket.on("test-video-call", function(stream){
	var video = document.createElement("video");
	// video.src = (window.URL||).createObjectURL(stream);
	// document.body.appendChild(video);
	// video.play();
	console.log(stream);
});

module.exports = socket;
},{"../../../private/javascript/mobile/view/chat/video":72,"../../../private/javascript/mobile/view/chat/waiting":74,"../../../private/javascript/mobile/view/message/box":85,"../lib/chat-id":19,"vn/lib/dom":22}],39:[function(require,module,exports){
window.socket = require("./post");
window.chatio = require("./chat");
},{"./chat":38,"./post":40}],40:[function(require,module,exports){
var Post = require("../model/post");
var $ = require("../lib/dom");

function Like(name, data){
	document.getElementsByName(name).forEach(function(dom){
		$(dom).emit("Like", data).emit("buttonLike", data);
	});
};
function Comment(name, count, data){
	// data: {count_comment, comment, user, post}
	document.getElementsByName(name).forEach(function(dom){
		$(dom).emit("Comment", count).call("addComment", data);
	});
};

var socket = io.connect(host.data);
socket.emit("addUser", user.id);

socket.on("add-post", function(data){
	var post = data.post, feed = data.feed;
	$(document.getElementById("user_feed")).prepend(PostBox(new Post({
		feed_action: feed.action,
		feed_id: feed.id,
		feed_post: feed.post,
		feed_user: data.user[0],
		post_id: post.id,
		post_user: data.user,
		share_with: post.role,
		post_type: post.type,
		post_time: new Date(),
		post_content: post.content,
		has_like: false,
		has_comment: false,
		has_count: false
	})));
});

socket.on("add-comment", function(data){ Comment("p"+data.post.id, data.count_comment, data) });
socket.on("add-reply", function(data){ Comment("c"+data.comment.id, data.count_reply, data) });

socket.on("edit-post", function(data){
	document.getElementsByName("p"+data.id).forEach(function(dom){
		$(dom).call("setEdit", data);
	});
});

socket.on("like-post", function(data){ Like("p"+data.post, data) });
socket.on("like-comment", function(data){ Like("c"+data.comment, data) });
socket.on("like-reply", function(data){ Like("r"+data.reply, data) });

module.exports = socket;
},{"../lib/dom":22,"../model/post":33}],41:[function(require,module,exports){
var $ = require("vn/lib/dom");
var app = require("vn/lib/router");
var async = require("vn/lib/async");
window.main = $("#main_page");

async([
	app.set("/account/([a-z]+)$", require("./router/account")),
	app.set("/menu$", require("./router/menu")),
	app.set("/messages$", require("./router/message")),
	app.set("/message/([0-9]{1,20})$", require("./router/chat")),
	app.set("/notifications", require("./router/notification")),
	app.set("/([0-9]{1,20})", require("./router/userid")),
	app.set("/([a-z0-9\.]{1,50})", require("./router/user")),
	app.set("/", require("./router/index"))
]);

app.handle();
},{"./router/account":42,"./router/chat":43,"./router/index":44,"./router/menu":45,"./router/message":46,"./router/notification":47,"./router/user":48,"./router/userid":49,"vn/lib/async":17,"vn/lib/dom":22,"vn/lib/router":28}],42:[function(require,module,exports){
var cookie = require("vn/lib/cookie");
var app = require("vn/lib/router");

var AccountLogin = require("../view/account/login");
var AccountRegister = require("../view/account/register");
var AccountConfirm = require("../view/account/confirm");
var AccountRecover = require("../view/account/recover");
var AccountError = require("../view/account/error");
var AccountConfirmResetPass = require("../view/account/confirmresetpass");
var AccountResetPass = require("../view/account/resetpass");

module.exports = function AccountController(tab){
	if(cookie.has("uid") && cookie.has("act")) return app.go("/");

	if(cookie.has("confirm") || "confirm"===tab) return main.html(AccountConfirm());

	if(cookie.has("confirmresetpass") || "confirmresetpass"===tab) return main.html(AccountConfirmResetPass());

	if(cookie.has("resetpass") || "resetpass"===tab) return main.html(AccountResetPass());

	switch(tab){
		case "login": return main.html(AccountLogin());
		case "recover": return main.html(AccountRecover());
		case "register": return main.html(AccountRegister());
		default: return main.html(AccountError());
	}
};
},{"../view/account/confirm":53,"../view/account/confirmresetpass":54,"../view/account/error":55,"../view/account/login":56,"../view/account/recover":57,"../view/account/register":58,"../view/account/resetpass":59,"vn/lib/cookie":20,"vn/lib/router":28}],43:[function(require,module,exports){
var $ = require("vn/lib/dom");
var cookie = require("vn/lib/cookie");
var cache = require("vn/lib/cache");
var ChatId = require("vn/lib/chat-id");

var User = require("vn/model/user");

var ChatHome = require("../view/chat/home");
var ChatError = require("../view/chat/error");

module.exports = function ChatController(receiver_id){

	if(cookie.has("uid") && cookie.has("act")){
		window.user = new User(cache.getLocal("user").toArray());
		require("vn/socket");

		if(receiver_id != cookie.get("uid")){

			// create chatid
			var chat_room = ChatId([user.id, receiver_id]);

			// create room chat for user.id and receiver.id
			chatio.emit("add-room-chat", chat_room);
			
			// show loading here
			// header show receiver name
			var receiver = cache.hget("user_chat", receiver_id);
			if(receiver) return main.html(ChatHome(chat_room, receiver));

			$.ajax({
				url: host.chat + "/chat/receiver",
				type: "get",
				data: {
					receiver: receiver_id,
					sender: user.id
				},
				dataType: "object",
				success: function(data){
					if(!data.error){
						receiver = new User(data.message);

						main.html(ChatHome(chat_room, receiver));

						cache.hset("user_chat", receiver_id, receiver);
					}
				}
			});
		}else{
			return main.html(ChatError());
		}
	}else{
		cache.set("next-page", this.url());
		return app.go("/account/login");
	}
};
},{"../view/chat/error":68,"../view/chat/home":70,"vn/lib/cache":18,"vn/lib/chat-id":19,"vn/lib/cookie":20,"vn/lib/dom":22,"vn/model/user":35,"vn/socket":39}],44:[function(require,module,exports){
var cookie = require("vn/lib/cookie");
var cache = require("vn/lib/cache");
var $ = require("vn/lib/dom");
var User = require("vn/model/user");
var AccountLogin = require("../view/account/login");
var IndexHome = require("../view/index/home");

module.exports = function IndexController(){
	if(cookie.has("uid") && cookie.has("act")){
		window.user = new User(cache.getLocal("user").toArray());
		require("vn/socket");
		main.html(IndexHome());
		document.title = lang.title_index;
	}else{
		document.title = lang.title_account_index;
		main.html(AccountLogin("WebSite"));
	}
};
},{"../view/account/login":56,"../view/index/home":83,"vn/lib/cache":18,"vn/lib/cookie":20,"vn/lib/dom":22,"vn/model/user":35,"vn/socket":39}],45:[function(require,module,exports){
var cookie = require("vn/lib/cookie");
var cache = require("vn/lib/cache");
var app = require("vn/lib/router");
var $ = require("vn/lib/dom");
var User = require("vn/model/user");
var Menu = require("../view/menu");

module.exports = function MenuController(){
	if(cookie.has("uid")&&cookie.has("act")){
		window.user = new User(cache.getLocal("user").toArray());
		require("vn/socket");
		main.html(Menu());
	}else{
		cache.set("next-page", app.url());
		app.go("/account/login");
	}
}
},{"../view/menu":84,"vn/lib/cache":18,"vn/lib/cookie":20,"vn/lib/dom":22,"vn/lib/router":28,"vn/model/user":35,"vn/socket":39}],46:[function(require,module,exports){
var cookie = require("vn/lib/cookie");
var cache = require("vn/lib/cache");
var app = require("vn/lib/router");
var User = require("vn/model/user");
var MessageIndex = require("../view/message/index");

module.exports = function MessageController(){
	if(cookie.has("uid") && cookie.has("act")){
		window.user = new User(cache.getLocal("user").toArray());
		/* show list chat history */
		require("vn/socket");
		return main.html(MessageIndex());
	}else{
		/**
		 *	if have not login => redirect to login, and if have done then redirect to message
		 */
		cache.set("next-page", app.url());
		return app.go("/account/login");
	}
};
},{"../view/message/index":86,"vn/lib/cache":18,"vn/lib/cookie":20,"vn/lib/router":28,"vn/model/user":35,"vn/socket":39}],47:[function(require,module,exports){
var cookie = require("vn/lib/cookie");
var cache = require("vn/lib/cache");
var app = require("vn/lib/router");
var NotifyHome = require("../view/notify/home");
var User = require("vn/model/user");

module.exports = function NotifitionController(){
	if(cookie.has("uid") && cookie.has("act")){
		window.user = new User(cache.getLocal("user").toArray());
		require("vn/socket");
		main.html(NotifyHome());
	}else{
		cache.set("next-page", app.url());
		app.go("/account/login");
	}
};
},{"../view/notify/home":88,"vn/lib/cache":18,"vn/lib/cookie":20,"vn/lib/router":28,"vn/model/user":35,"vn/socket":39}],48:[function(require,module,exports){
var cookie = require("vn/lib/cookie");
var cache = require("vn/lib/cache");
var User = require("vn/model/user");
var $ = require("vn/lib/dom");

var ErrorPage = require("../view/index/error");
var UserProfile = require("../view/user/profile");

module.exports = function UserControler(username){
	if(/[^a-z]/.test(username[0])) return ErrorPage();
	if(/\./.test(username[username.length-1])) return ErrorPage();

	if(cookie.has("uid")&&cookie.has("act")){
		window.user = new User(cache.getLocal("user").toArray());
		require("vn/socket");

		var profile = cache.hget("user", username);
		if(profile) return main.html(UserProfile(profile));

		$.ajax({
			url: host.data + "/user/profile",
			type: "get",
			data: { id: username, is: "username", user_id: user.id, token: user.token },
			success: function(data){
				if(data.error) return ErrorPage();
				profile = new User(data.message);
				main.html(UserProfile(profile));
				cache.hset("user", profile.id, profile);
				cache.hset("user", profile.username, profile);
			}
		});
	}else{
		cache.set("next-page", app.url());
		app.go("/account/login");
	}
};
},{"../view/index/error":82,"../view/user/profile":105,"vn/lib/cache":18,"vn/lib/cookie":20,"vn/lib/dom":22,"vn/model/user":35,"vn/socket":39}],49:[function(require,module,exports){
var cookie = require("vn/lib/cookie");
var cache = require("vn/lib/cache");
var User = require("vn/model/user");
var $ = require("vn/lib/dom");

var ErrorPage = require("../view/index/error");
var UserProfile = require("../view/user/profile");

module.exports = function UserControler(user_id){
	if(cookie.has("uid")&&cookie.has("act")){
		window.user = new User(cache.getLocal("user").toArray());
		require("vn/socket");

		var profile = cache.hget("user", user_id);
		if(profile) return main.html(UserProfile(profile));

		$.ajax({
			url: host.data + "/user/profile",
			type: "get",
			data: { id: user_id, is: "id", user_id: user.id, token: user.token },
			success: function(data){
				if(data.error) return ErrorPage();
				profile = new User(data.message);
				main.html(UserProfile(profile));
				cache.hset("user", profile.id, profile);
				cache.hset("user", profile.username, profile);
			}
		});
	}else{
		cache.set("next-page", app.url());
		app.go("/account/login");
	}
};
},{"../view/index/error":82,"../view/user/profile":105,"vn/lib/cache":18,"vn/lib/cookie":20,"vn/lib/dom":22,"vn/model/user":35,"vn/socket":39}],50:[function(require,module,exports){
const $ = require("vn/lib/dom");

module.exports = function AccountTemplate(header, section, footer){
	var dom = $({
		render: function(){
			return this.div({className: "container-fluid", id: "account"},
				this.header({className: "row"}, this.div({className: "text-center"}, header)),
				this.section({className: "row"}, section),
				this.footer({className: "row"}, footer)
			)
		}
	});
	return dom;
};
},{"vn/lib/dom":22}],51:[function(require,module,exports){
var $ = require("vn/lib/dom");
var hash = require("vn/lib/hash");
var is = require("vn/lib/is");
var app = require("vn/lib/router");

var MenuIndex = require("./index")("").addClass("absolute");

module.exports = function ChatTemplate(chat_id, receiver, chat_list, chat_form){
	var menu_header, dom;
	
	menu_header = $({
		call_video: function(){
			chatio.emit("waiting-for-call", {id: chat_id, receiver: receiver.id, sender: user, is: "video"});
			dom.calling = true;
			menu_header.remove();
		},
		call_audio: function(){
			chatio.emit("waiting-for-call", {id: chat_id, receiver: receiver.id, sender: user, is: "audio"});
			dom.calling = true;
			menu_header.remove();
		},
		render: function(){
			return this.ul({className: "absolute"},
				this.li({onclick: this.call_audio}, this.a("Calling"), this.glyphicon("glyphicon-earphone")),
				this.li({onclick: this.call_video}, this.a("Calling video"), this.glyphicon("glyphicon-facetime-video"))
			)
		}
	});

	dom = $({
		toggle_menu: function(){
			if(dom.clicked_menu){
				MenuIndex.remove();
				dom.clicked_menu = false;
			}else{
				dom.children("header").append(MenuIndex);
				dom.clicked_menu = true;
			}
		},
		choose_type_chat: function(){
			if(dom.calling) return;

			if(dom.click_menu){
				menu_header.remove();
				dom.click_menu = false;
			}else{
				dom.children("header").append(menu_header);
				dom.click_menu = true;
			}
		},
		render: function(){
			return this.div({className: "container-fluid", id: "chat"}, 
				this.header({className: "row relative"}, 
					this.div({className: "message-header clearfix"},
						this.div({className: "pull-left"},
							this.a({className: "glyphicon glyphicon-menu-hamburger", onclick: this.toggle_menu})
						),
						this.div({className: "pull-left text-center"}, receiver.name),
						this.div({className: "pull-right"},
							this.a({
								onclick: this.choose_type_chat, 
								className: "glyphicon glyphicon-option-vertical"
							})
						)
					)
				),
				this.section({className: "row"}, chat_list),
				this.footer({className: "row"}, chat_form)
			)
		}
	});
	return dom;
};
},{"./index":52,"vn/lib/dom":22,"vn/lib/hash":26,"vn/lib/is":27,"vn/lib/router":28}],52:[function(require,module,exports){
var app = require("vn/lib/router");
var $ = require("vn/lib/dom");

module.exports = function IndexTemplate(section){
	var dom = $({
		router_index: function(e){ app.go("/") },
		router_media: function(e){ app.go("/media") },
		router_message: function(e){ app.go("/messages") },
		router_notify: function(e){ app.go("/notifications") },
		router_search: function(e){ app.go("/search") },
		router_menu: function(e){ app.go("/menu") },
		render: function(){
			return this.div({className: "container-fluid", id: "index"}, 
				this.header({className: "row"},
					this.a({onclick: this.router_index, className: "glyphicon glyphicon-home"}),
					this.a({onclick: this.router_media, className: "glyphicon glyphicon-music"}),
					this.a({onclick: this.router_message, className: "glyphicon glyphicon-envelope"}),
					this.a({onclick: this.router_notify, className: "glyphicon glyphicon-globe"}),
					this.a({onclick: this.router_search, className: "glyphicon glyphicon-search"}),
					this.a({onclick: this.router_menu, className: "glyphicon glyphicon-menu-hamburger"})
				),
				this.section({className: "row"}, section)
			)
		}
	});
	return dom;
};
},{"vn/lib/dom":22,"vn/lib/router":28}],53:[function(require,module,exports){
var Template = require("../../template/account");
var is = require("vn/lib/is");
var cookie = require("vn/lib/cookie");
var app = require("vn/lib/router");
var $ = require("vn/lib/dom");

module.exports = function AccountConfirm(){
	
	var header = "Confirmation account";

	var section = $({
		controller: {
			error: function(text){
				this.html(text);
			},
			button: function(disable){
				this.disable(disable);
			}
		},
		submit_form: function(e){
			e.preventDefault();

			var form = this;
			var data = {
				email: form.email.value,
				code: form.code.value
			};

			if(!(is.email(data.email)||is.phone(data.email))){
				section.emit("error", is.get("email"));
				return form.email.focus();
			};
			if(!is.code(data.code)){
				section.emit("error", is.get("confirm"));
				return form.code.focus();
			};

			$.ajax({
				url: host.data + "/account/confirm",
				type: "patch",
				data: data,
				dataType: "object",
				success: function(info){
					if(info.error) return section.emit("error", lang[info.message]).emit("button", false);

					cookie.init({day: 365, path: "/"});
					cookie.set(info.message.cookie);

					return app.go("/");
				}
			});

			section.emit("error", "").emit("button", true);
		},
		render: function(){
			return this.form({className: "account", onsubmit: this.submit_form},
				this.div({controller: "error", className: "error"}),
				this.div({className: "input-group"},
					this.email(lang.placeholder_email),
					this.input({name: "code", placeholder: lang.placeholder_code, className: "form-control", maxLength: 5, minLength: 5})
				),
				this.submit({className: "btn btn-primary btn-sm account-btn", controller: "button"}, lang.button_confirm)
			)
		}
	});

	var footer = "";

	return Template(header, section, footer);
};
},{"../../template/account":50,"vn/lib/cookie":20,"vn/lib/dom":22,"vn/lib/is":27,"vn/lib/router":28}],54:[function(require,module,exports){
var Template = require("../../template/account");
var $ = require("vn/lib/dom");

module.exports = function AccountConfirmResetPassword(){
	var header = "Confirmation to change password";
	var section = $({
		render: function(){
			return this.form({className: "account", onsubmit: this.submit_form})
		}
	});
	var footer = "";
	return Template(header, section, footer);
};
},{"../../template/account":50,"vn/lib/dom":22}],55:[function(require,module,exports){
var Template = require("../../template/account");
module.exports = function AccountError(){
	return Template("WEBSITE", "This page not found");
};
},{"../../template/account":50}],56:[function(require,module,exports){
var Template = require("../../template/account");
var is = require("vn/lib/is");
var cookie = require("vn/lib/cookie");
var cache = require("vn/lib/cache");
var app = require("vn/lib/router");
var $ = require("vn/lib/dom");

module.exports = function AccountLogin(label_index){
	
	var header = label_index||"Login account";

	// footer content
	var footer = $({
		controller: {
			prepend: function(){
				if(!footer.forgot_link){
					footer.forgot_link = $({
						render: function(){
							return this.div(null, "Or ", 
								this.a({onclick: function(e){ app.go("/account/recover") }}, "forgot your password")
							)
						}
					});
					this.prepend(footer.forgot_link);
				}
			}
		},
		handleClick: function(){
			app.go("/account/register");
		},
		render: function(){
			return this.div({className: "text-center", controller: "prepend"}, 
				this.div(null, this.button({className: "btn btn-sm btn-default", onclick: this.handleClick}, "Create Account"))
			)
		}
	});

	var section = $({
		controller: {
			error: function(text){
				this.html(text ? lang[text] : "");
			},
			button: function(disable){
				this.disable(disable);
			}
		},
		submit_form: function (e) {
			e.preventDefault();
			is.start();

			var form = this;
			var data = {
				email: form.email.value,
				pass: form.pass.value
			};

			if(!(is.email(data.email)||is.id(data.email)||is.phone(data.email)||is.username(data.email))){
				section.emit("error", is.get("email"));
				return form.email.focus();
			};
			if(!is.pass(data.pass)){
				section.emit("error", is.get("pass"));
				return form.pass.focus();
			};

			if(section.get("email")===data.email && section.get("pass")===data.pass) return;

			$.ajax({
				url: host.data + "/account/login",
				type: "post",
				data: data,
				dataType: "object",
				success: function(info){
					if(info.error) {
						section.emit("error", info.message).emit("button", false);
						return footer.emit("prepend");
					};
					
					cookie.init({day: 365, path: "/"});
					cookie.set(info.message.cookie);

					cache.setLocal("user", info.message.user);

					return app.go(cache.get("next-page")||"/");
				}
			});

			section.emit("error", "").emit("button", true);

			section.set("email", data.email).set("pass", data.pass);
		},
		render: function(){
			return this.form({className: "account", onsubmit: this.submit_form},
				this.div({className: "error", controller: "error"}),
				this.div({className: "input-group"},
					this.email(lang.placeholder_email),
					this.pass(lang.placeholder_pass)
				),
				this.div({className: "input-group clearfix", style: "border: none"},
					this.submit(
						{
							className: "btn btn-primary btn-sm account-btn pull-right", 
							controller: "button"
						}, 
						lang.button_login
					)
				)
			)
		}
	});

	return Template(header, section, footer);
};
},{"../../template/account":50,"vn/lib/cache":18,"vn/lib/cookie":20,"vn/lib/dom":22,"vn/lib/is":27,"vn/lib/router":28}],57:[function(require,module,exports){
var Template = require("../../template/account");
var is = require("vn/lib/is");
var app = require("vn/lib/router");
var $ = require("vn/lib/dom");

module.exports = function AccountRecover(){
	var header = "Recover account";

	var footer = $({
		router: function(e){
			e.preventDefault();
			app.go(this.href);
		},
		render: function(){
			return this.div({style: "margin: 4px 10px;"}, 
				"If you have code, please ", 
				this.a({href: "/account/confirmresetpass", onclick: this.router}, "confirmation"),
				" and then ",
				this.a({href: "/account/resetpass", onclick: this.router}, "reset password")
			)
		}
	});

	var section = $({
		controller: {
			error: function(text){
				this.html(text ? lang[text] : "");
			},
			disable: function(value){
				this.disable(value);
			}
		},
		submit_form: function (e) {
			e.preventDefault();

			var form = this;
			var data = { email: form.email.value };

			if(is.email(data.email) || is.phone(data.email)){
				section.emit("disable", true);
				$.ajax({
					url: host.data + "/account/recover",
					type: "get",
					dataType: "object",
					success: function(data){
						if(data.error) return section.emit("error", data.message).emit("disable", false);
						// show option send message to get code to reset password
					}
				});
			}else{
				section.emit("error", is.get("email")).emit("disable", false);
				form.email.focus();
			}
		},
		render: function(){
			return this.form({className: "account", onsubmit: this.submit_form},
				this.div({className: "error", controller: "error"}),
				this.div({className: "input-group"},
					this.input({name: "email", className: "form-control", placeholder: lang.placeholder_email, maxLength: 100})
				),
				this.submit({controller: "disable", className: "btn btn-primary btn-sm account-btn"}, lang.button_recover)
			)
		}
	});
	return Template(header, section, footer);
};
},{"../../template/account":50,"vn/lib/dom":22,"vn/lib/is":27,"vn/lib/router":28}],58:[function(require,module,exports){
var Template = require("../../template/account");
var is = require("vn/lib/is");
var cookie = require("vn/lib/cookie");
var app = require("vn/lib/router");
var $ = require("vn/lib/dom");

module.exports = function AccountRegister(){
	
	var header = "Create new account";

	var section = $({
		controller: {
			name: function(text){ 
				this.html(text ? lang[text] : "");
			},
			email: function(text){ 
				this.html(text ? lang[text] : ""); 
			},
			gender: function(text){ 
				this.html(text ? lang[text] : ""); 
			},
			birthday: function(text){ 
				if(text) this.html(lang[text]).hidden(false);
				else this.html("").hidden(true);
			},
			pass: function(text){ 
				this.html(text ? lang[text] : ""); 
			},
			button: function(disable){
				this.disable(disable);
			}
		},
		submit_form: function (e) {
			e.preventDefault();
			is.start();

			var form = this;
			var data = {
				fname: form.fname.value,
				lname: form.lname.value,
				email: form.email.value,
				gender: form.gender.value,
				day: form.day.value,
				month: form.month.value,
				year: form.year.value,
				pass: form.pass.value
			};
			section.emit("name", (is.name(data.fname)&&is.name(data.lname))?"":is.get("name"));
			section.emit("email", (is.email(data.email)||is.phone(data.email))?"":is.get("email"));
			section.emit("gender", is.gender(data.gender)?"":is.get("gender"));
			section.emit("birthday", is.birthday(data.day, data.month, data.year)?"":is.get("birthday"));
			section.emit("pass", is.pass(data.pass)?"":is.get("pass"));

			if(is.error) return;
			
			section.emit("button", true);

			$.ajax({
				url: host.data + "/account/register",
				type: "post",
				data: data,
				dataType: "object",
				async: true,
				success: function(info){
					if(info.error){
						for(var i in info.message){
							section.emit(i, lang[info.message[i]]);
						};
						return section.emit("button", false);
					}else{
						cookie.init({day: 3, path: "/"});
						cookie.set(info.message.cookie); /* {confirm: "email|phone"} */

						return app.go("/account/confirm");
					}
				}
			});

		},
		render: function(){
			return this.form({className: "account", id: "register", onsubmit: this.submit_form},
				this.div({className: "form-group"},
					this.input({name: "fname", className: "form-control", placeholder: lang.placeholder_fname, maxLength: 50}),
					this.input({name: "lname", className: "form-control", placeholder: lang.placeholder_fname, maxLength: 50}),
					this.div({className: "error", controller: "name"})
				),
				this.div({className: "form-group"},
					this.input({name: "email", className: "form-control", placeholder: lang.placeholder_email, maxLength: 120}),
					this.div({className: "error", controller: "email"})
				),
				this.div({className: "form-group"},
					this.div({style: "display: inline-block"}, lang.label_gender),
					this.select("gender", {
						"0": "Choose",
						"male": "Male",
						"female": "Female"
					}),
					this.div({className: "error", controller: "gender", style: "margin-top: 3px"})
				),
				this.div({className: "form-group"},
					this.div({id: "birthday"},
						this.div(lang.label_birthday),
						this.div(null,
							this.span(null, this.input({name: "day", placeholder: lang.select_day})),
							this.span("/"),
							this.span(null, this.input({name: "month", placeholder: lang.select_month})),
							this.span("/"),
							this.span(null, this.input({name: "year", placeholder: lang.select_year}))
						),
						this.div({className: "error", controller: "birthday", hidden: true})
					)
				),
				this.div({className: "form-group"},
					this.pass(lang.placeholder_pass, true),
					this.div({className: "error", controller: "pass"})
				),
				this.div({className: "account-footer font-sm"}),
				this.submit({controller: "button", className: "btn btn-primary account-btn"}, lang.button_register)
			)
		}
	});

	var footer = $({
		router: function(e){
			app.go("/account/login");
		},
		render: function(){
			return this.div({className: "text-center"}, "Or ", this.a({onclick: this.router}, "login a either account"))
		}
	});

	return Template(header, section, footer);
};
},{"../../template/account":50,"vn/lib/cookie":20,"vn/lib/dom":22,"vn/lib/is":27,"vn/lib/router":28}],59:[function(require,module,exports){
var Template = require("../../template/account");
var $ = require("vn/lib/dom");

module.exports = function AccountResetPassword(){
	var header = "Change password";
	var section = $({
		render: function(){
			return this.form({className: "account", onsubmit: this.submit_form})
		}
	});
	var footer = "";
	return Template(header, section, footer);
};
},{"../../template/account":50,"vn/lib/dom":22}],60:[function(require,module,exports){
var Control = require("./control");
var cache = require("vn/lib/cache");

module.exports = function(post, next){
	/* create audio object */
	var audio = new Audio(), data = post.data;
	audio.src = ("string"===typeof data) ? data : [cdn[data.host], data.path].join("/");
	audio.volume = Number(cache.getLocal("vol")||"0.7");
	audio.preload = "auto";
	audio.autobuffer = true;

	return new Control(post.autoplay, audio, next).remove("canvas");
};
},{"./control":61,"vn/lib/cache":18}],61:[function(require,module,exports){
var cache = require("vn/lib/cache");
var $ = require("vn/lib/dom");
var plugin = require("./plugin");
var timer = require("vn/lib/time");

module.exports = function(autoplay, video, next_video){
	function change_volume(vol, child, dom){
		if(vol>1) vol = 1; else if(vol<0) vol = 0;
		child[0].style.width = (vol*100)+"%";
		child[1].style.left = (vol*80)+"%";
		
		video.volume = vol;
		dom.attr("class", dom.attr("class").replace(/(down|off|up)$/, plugin.volumeClass(vol)));
	};
	function change_timeupdate(current, child, time){
		var duration = video.duration, currentTime = current*duration;
		video.currentTime = currentTime;

		child.css("width", (current*100)+"%");
		time.text(timer.timecountdown(duration, currentTime));
	};

	var dom = $({
		controller: {
			pause: function(){
				video.pause();
				cache.del("playing");
				dom.children("play").changeClass("glyphicon-pause", "glyphicon-play");
			},
			play: function(play){
				var vi = cache.get("playing");
				if(vi) vi.call("pause");

				dom.children("play").changeClass("glyphicon-play", "glyphicon-pause");
				cache.set("playing", dom);
				video.play();
			},
			video: function(src){
				var vi = cache.get("playing");
				if(vi) vi.call("pause");

				video.src = src;

				dom.children("play").changeClass("glyphicon-play", "glyphicon-pause");
				cache.set("playing", dom);
				video.play();
			}
		},
		play: function(e){
			return video.paused ? dom.call("play"): dom.call("pause");
		},
		mute: function(e){
			var span = $(this).children(0);
			if(video.muted){
				video.muted = false;
				span.attr("class", span.attr("class").replace(/(off)$/, plugin.volumeClass(video.volume)));
			}else{
				video.muted = true;
				span.changeClass("glyphicon-volume-"+plugin.volumeClass(video.volume), "glyphicon-volume-off");
			}
		},
		volume_mousedown: function(e){
			dom.change_volume = true;
			change_volume((e.clientX-this.offsetLeft)/this.offsetWidth, this.childNodes, dom.children("volume"));
		},
		volume_mousemove: function(e){
			if(dom.change_volume) change_volume((e.clientX-this.offsetLeft)/this.offsetWidth, this.childNodes, dom.children("volume"));
		},
		volume_mouseup: function(e){
			dom.change_volume = false;
		},
		timeline_mousedown: function(e){
			dom.timeupdate = true;
			change_timeupdate((e.clientX-this.offsetLeft)/this.offsetWidth, dom.children("timeupdate"), dom.children("time"));
		},
		timeline_mousemove: function(e){
			if(dom.timeupdate) change_timeupdate((e.clientX-this.offsetLeft)/this.offsetWidth, dom.children("timeupdate"), dom.children("time"));
		},
		timeline_mouseup: function(e){
			dom.timeupdate = false;
		},
		zoom: function(){
			if(dom.zoomVideo){
				dom.zoomVideo = false;
				plugin.exitFullscreen();
			}else{
				dom.zoomVideo = true;
				plugin.fullscreen(dom.s);
			}
		},
		setup: function(e){},
		playVideo: function(canvas){
			if("video"===video.is){
				var cv = canvas.s;
				var context = cv.getContext("2d");

				context.width = cv.width;
				context.height = cv.height;

				setTimeout(function(){
					context.drawImage(video, 0, 0, context.width, context.height);	
				}, 500);

				video.onplay = function(){
					(function loop() {
						if(!video.paused && !video.ended){
							context.drawImage(video, 0, 0, context.width, context.height);
							setTimeout(loop, 30);
						}
					})()
				}
			}
		},
		render: function(){
			video.addEventListener("timeupdate", function(e){
				var current = this.currentTime, duration = this.duration;
				dom.children("timeupdate").css("width", (current/duration*100)+"%");
				dom.children("time").text(timer.timecountdown(duration, current));

				if(current===duration){
					dom.children("play").changeClass("glyphicon-pause", "glyphicon-repeat");
					cache.del("playing");
				}
			});
			return this.div({className: "video-control"}, 
				this.canvas({onclick: this.play}, this.playVideo),
				this.div({className: "box"},
					this.div({className: "timeline"}, 
						this.div({className: "progress", onmousedown: this.timeline_mousedown, onmousemove: this.timeline_mousemove, onmouseup: this.timeline_mouseup}, 
							this.div({className: "child", node: "timeupdate"})
						)
					),
					this.div({className: "control clearfix"},
						this.div({className: "pull-left"},
							this.button({onclick: this.play}, this.glyphicon("glyphicon-play", "play")),
							next_video?this.button({onclick: next_video}, this.glyphicon("glyphicon-step-forward")):"",
							this.button({onclick: this.mute}, this.glyphicon("glyphicon-volume-"+plugin.volumeClass(video.volume), "volume")),
							this.div({className: "volume"},
								this.div({className: "box"},
									this.div({className: "progress", onmousedown: this.volume_mousedown, onmousemove: this.volume_mousemove, onmouseup: this.volume_mouseup}, 
										this.div({className: "child", style: "width: " + (video.volume*100) + "%"}),
										this.button({className: "child around", style: "left: " + (video.volume*80) + "%"})
									)
								)
							),
							this.div({className: "relative time"}, this.div({className: "absolute", node: "time"}, function(div){
								video.onloadedmetadata = function(){
									div.text(timer.timecountdown(this.duration, 0));
								}
							}))
						),
						this.div({className: "pull-right"}, 
							this.button({node: "setup", onclick: this.setup}, this.glyphicon("glyphicon-cog")),
							video.is==="video"?this.button({onclick: this.zoom}, this.glyphicon("glyphicon-resize-full", "zoom")):""
						)
					)
				)
			)
		}
	});

	if(autoplay) dom.call("play", true);

	dom.on("change:audio", function(file){
		dom.call("play");
	});
	dom.on("change:video", function(file){
		dom.call("video", cdn[file.data.host]+"/"+file.data.path);
	});

	return dom;
};
},{"./plugin":65,"vn/lib/cache":18,"vn/lib/dom":22,"vn/lib/time":29}],62:[function(require,module,exports){
var $ = require("vn/lib/dom");

module.exports = function(post){
	var dom = $({
		render: function(){
			return this.img([post.data[0], post.data[1], 160, post.data[3], post.data[4]].join("/"))
		}
	});
	return dom;
}
},{"vn/lib/dom":22}],63:[function(require,module,exports){
var Photo = require("./photo");
var $ = require("vn/lib/dom");

module.exports = function(list){
	var dom = $({
		render: function(){
			return this.div({className: "post-photos"})
		}
	});
	return dom;
};
},{"./photo":62,"vn/lib/dom":22}],64:[function(require,module,exports){
var Music = require("./audio");
var Video = require("./video");
var $ = require("vn/lib/dom");

module.exports = function(list, type, callback){
	var Media = type==="audio" ? Music : Video;
	var file = list[0], count = list.length, max = count - 1;
	var next = 1;
	var media = Media(file, count>1 ? function(){
		media.emit("change:"+type, list[next]);
		callback(next);
		if(next>=max) next = -1;
		next++;
	} : null);

	if(count<2) return media;

	var dom = $({
		play: function(e){
			e.preventDefault();
			media.emit("change:"+type, list[this]);
			next = this+1;
		},
		render: function(){
			return this.div({className: "playlist"},
				this.div({style: "display: block", node: "control"}, media), 
				this.div({className: "list-group"}, function(div){
					for(var i=0, n=list.length; i<n; i++){
						file = list[i];

						div.append(
							this.div({className: "list-item clearfix"},
								this.div({className: "pull-left"}, i+1), 
								this.div({className: "pull-left media-info"}, 
									this.a({onclick: this.play.bind(i)}, file.content||"Khong co tieu de") 
								),
								this.div({className: "pull-right"}, file.data.duration)
							)
						)
					}
				}.bind(this))
			)
		}
	});
	return dom;
};
},{"./audio":60,"./video":66,"vn/lib/dom":22}],65:[function(require,module,exports){
module.exports = {
	volumeClass: function(vol){
		return (vol<=0)?"off":((vol<0.5)?"down":"up");
	},
	fullscreen: function(div){
		var fn = div.requestFullscreen;
		if(!fn){ 
			['mozRequestFullScreen', 'msRequestFullscreen', 'webkitRequestFullScreen'].forEach(function (req) {
		     	fn = fn || div[req];
		   	});
		};
		fn.call(div);
	},
	exitFullscreen: function(){
		if(document.webkitExitFullscreen) document.webkitExitFullscreen();
		else if(document.mozCancelFullScreen) document.mozCancelFullScreen();
		else if(document.msExitFullscreen) document.msExitFullscreen();
		else document.exitFullscreen();
	}
}
},{}],66:[function(require,module,exports){
var Control = require("./control");
var timer = require("vn/lib/time");
var cache = require("vn/lib/cache");

module.exports = function Video(post, next){
	/* create video object */
	var video = document.createElement("video"), link_video = ("string"===typeof post.data) ? post.data : [cdn[post.data.host], post.data.path].join("/");
	video.src = video.canPlayType("video/mp4") ? link_video : link_video.replace(/mp4$/, "ogg");
	video.volume = Number(cache.getLocal("vol")||"0.7");
	video.preload = "auto";
	video.autobuffer = true;
	video.is = "video";
	
	return new Control(post.autoplay, video, next);
};
},{"./control":61,"vn/lib/cache":18,"vn/lib/time":29}],67:[function(require,module,exports){
var $ = require("vn/lib/dom");
module.exports = function ChatBox(sender_id, user_data, chat_data){
	/**
	 * 	chat_data: { user, text, time }
	 * 	user_data: Object { user }
	 */
	var dom = $({
		render: function(){
			return this.li(
				{
					className: "message-item " + (sender_id===user_data.id ? "message-sender" : "message-receiver")
				}, 
				this.span(chat_data.text)
			)
		}
	});
	return dom;
};
},{"vn/lib/dom":22}],68:[function(require,module,exports){
var Template = require("../../template/chat");

module.exports = function(){
	return Template(user.name, "You can not chat with yourself", "");
};
},{"../../template/chat":51}],69:[function(require,module,exports){
var is = require("vn/lib/is");
var $ = require("vn/lib/dom");

var FormChat = require("vn/form/chat");
var ChatBox = require("./box");

module.exports = function(chat_room, receiver){
	var sender_id = user.id;
	var receiver_id = receiver.id;
	var form = new FormChat(sender_id, receiver_id);

	var origin_text_placeholder = "Enter content";
	
	var is_writing_chat_data = {chat_room: chat_room, sender: user.lname};

	var dom = $({
		controller: {
			hasChat: 0,
			limit: 10,
			index: -1,
			is_writing_chat: function(data){
				this.attr("placeholder", data.is==="writing" ? (data.sender + " is writing...") : origin_text_placeholder);
			}
		},
		submit_form: function(e){
			e.preventDefault();

			if(!form.done()) return;
			if(!is.id(form.sender)&&!is.id(form.receiver)) return;

			$.ajax({
				url: host.chat + "/chat",
				type: dom.get("hasChat") ? "put" : "post",
				data: form.data
			});

			this.content.value = "";
			this.content.focus();
			form = new FormChat(sender_id, receiver_id);
			form.hasChat = true;
		},
		keyup_content: function(e){
			if(!dom.is_writing_chat){
				is_writing_chat_data.is = "writing";
				chatio.emit("is-writing-chat", is_writing_chat_data);
				dom.is_writing_chat = true;
			};
			form.text = this.value;
		},
		stop_writing: function(){
			dom.is_writing_chat = false;
			delete is_writing_chat_data.is;
			chatio.emit("is-writing-chat", is_writing_chat_data);
		},

		button_upload: function(){
			this.childNodes[1].click();
		},
		upload_action: function(e){
			form.file = this.files[0];
		},
		render: function(){
			var pull_left = "btn btn-default btn-sm pull-left", 
				pull_right = "btn btn-sm pull-right btn-"
			;
			return this.form(
				{
					file: true, 
					onsubmit: this.submit_form, 
					className: "form form-chat", 
					id: "form-chat-" + chat_room
				},
				/* user name */
				this.header(null,
					this.div({className: "form-text"}, 
						this.textarea({
							name: "content", 
							className: "input-text", 
							onkeyup: this.keyup_content,
							onblur: this.stop_writing,
							placeholder: origin_text_placeholder,
							controller: "is_writing_chat"
						})
					)
				),

				/* input */
				this.footer({className: "clearfix"},
					this.button({className: pull_left, onclick: this.button_upload, node: "button_upload"}, 
						this.glyphicon("glyphicon-picture"), 
						this.input({type: "file", onchange: this.upload_action, accept: "image/*"})
					),
					this.button({className: pull_left, node: "button_smile"}, this.glyphicon("glyphicon-heart")),
					this.submit({className: pull_right+"primary form-btn", node: "button_submit"}, "Send")
				)
			)
		}
	});
	return dom;
};
},{"./box":67,"vn/form/chat":13,"vn/lib/dom":22,"vn/lib/is":27}],70:[function(require,module,exports){
var Template = require("../../template/chat");
var ListMessage = require("./list");
var FormChat = require("./form");

module.exports = function(chat_room, receiver){
	var form = FormChat(chat_room, receiver);
	var List = ListMessage(chat_room, receiver, function(hasChat){ form.set("hasChat", hasChat) });
	return Template(chat_room, receiver, List, form);
};
},{"../../template/chat":51,"./form":69,"./list":71}],71:[function(require,module,exports){
var ChatBox = require("./box");
var $ = require("vn/lib/dom");

function ajax(data, action){
	$.ajax({
		url: host.chat + "/chat",
		type: "get",
		data: data,
		success: action
	});
};

module.exports = function(chat_id, receiver, fn){

	var sender_id = user.id;
	var receiver_id = receiver.id;

	var user_data = {};
	user_data[sender_id] = user;
	user_data[receiver_id] = receiver;

	var ajax_data = {
		sender: sender_id,
		receiver: receiver_id,
		limit: 10,
		index: -1
	};

	var dom = $({
		controller: {
			load_more_ajax: function(){
				ajax(ajax_data, function(data){
					console.log(data);
					if(!data.error){
						var response = data.message, array = response.data, n = array.length;
						ajax_data.index = response.index;

						fn(1);

						Promise.all([
							(ajax_data.index < 0) ? dom.emit("loadmore", false).unset(["loadmore", "load_more_ajax"]) : null,
							(function(){
								if(n > 0){
									var ul = $(document.createElement("ul"));
									ul.attr("class", "list-message");

									for(var i = 0; i < n; i++){
										ul.append(ChatBox(sender_id, user_data[array[i].user], array[i]));
									};
									dom.children("list_message").prepend(ul);
								}
							})()
						]);
					}
				});
			},
			loadmore: function(yes){
				if(!yes) return this.css("display", "none").html("");

				if(!this.html()){
					var a = document.createElement("a");
					a.onclick = dom.get("load_more_ajax");
					a.innerHTML = "Show old message";
					this.append(a).css("display", "block");
					dom.children("list_message");
				}
			},
			chat: function(data){
				this.append(ChatBox(sender_id, user_data[data.user], data));
			}
		},
		divLoadList: function(ul){
			ajax(ajax_data, function(data){
				if(!data.error){
					var response = data.message, array = response.data, i = 0, n = array.length;
					ajax_data.index = response.index;

					fn(1); // set form with hasChat = 1;

					Promise.all([
						(function(){
							if(n > 0){
								for(; i < n; i++){
									ul.append(ChatBox(sender_id, user_data[array[i].user], array[i]));
								}
							}
						})(),
						(function(){
							dom.emit("loadmore", ajax_data.index > 0);
							console.log();
						})()
					]);
				}
			});
		},
		render: function(){
			return this.div({id: "list-chat-" + chat_id}, 
				this.div({controller: "loadmore", className: "more"}),
				this.div({node: "list_message"},
					this.ul({className: "list-message", controller: "chat"}, this.divLoadList)
				)
			)
		}
	});
	return dom;
};
},{"./box":67,"vn/lib/dom":22}],72:[function(require,module,exports){
var $ = require("vn/lib/dom");
var repeat = 110;
function error_action(e){
	console.log("error video call: ", e);
};

module.exports = function(data){
	var dom = $({
		controller: {
			image: function(src){
				this.attr("src", src);
			}
		},
		render: function(){
			return this.div({className: "modal", id: "video-calling"},
				this.div({className: "modal-box"},
					this.div({className: "modal-content"},
						this.section({className: "relative", style: "height: 500px;"}, 

							this.div({className: "img"}, this.img({controller: "image"})),

							this.div({className: "absolute", style: "width: 150px; right: 0; bottom: 0"}, 
								this.canvas(null, function(canvas){
									window.navigator.getUserMedia = (window.navigator.getUserMedia || window.navigator.webkitGetUserMedia || window.navigator.mozGetUserMedia || window.navigator.msgGetUserMedia);
									if(!window.navigator.getUserMedia) return;

									var video = document.createElement("video");
									var cv = canvas.s;
									var context = cv.getContext("2d");

									context.width = cv.width;
									context.height = cv.height;

									function success_action(stream){
										video.src = window.URL.createObjectURL(stream);
									};

									function view(video, context){
										context.drawImage(video, 0, 0, context.width, context.height);
										chatio.emit("video-call", {image: cv.toDataURL("image/jpg"), id: data.id});
									};

									navigator.getUserMedia({video: true, audio: true}, success_action, error_action);

									function callback(){
										view(video, context);
									};

									setInterval(callback, repeat);
								})
							)
						),
						this.footer(null)
					)
				)
			)
		}
	});
	return dom;
};
},{"vn/lib/dom":22}],73:[function(require,module,exports){
var VideoCall = require("./video");
var is = require("vn/lib/is");
var $ = require("vn/lib/dom");
var User = require("vn/model/user");

module.exports = function(data, fn){
	var sender = new User(data.sender);
	var dom = $({
		chat_url: function(){},
		cancel_action: function(){
			fn(false, data.receiver);
			dom.remove();
		},
		reply_action: function(){
			if("video"===data.is){
				document.getElementsByClassName("modal")[0].remove();
				chatio.emit("video-call-accept", [sender.id, data.receiver]);
				$(document.body).prepend(VideoCall({id: data.id, sender: user.id}));
			};
			// fn(true, data.receiver);
		},
		render: function(){
			return this.div({className: "list-group-item"},
				this.div({className: "clearfix"},
					this.div({className: "pull-left"},
						this.div({className: "user-avatar user-avatar-md md"},
							this.img({onclick: this.chat_url, src: sender.avatar})
						)
					),
					this.div({className: "pull-left"}, 
						this.div({className: "user-name user-name-md md"},
							this.a({onclick: this.chat_url}, sender.name)
						),
						this.div("is calling")
					),
					this.div({className: "pull-right"},
						this.button(
							{
								onclick: this.reply_action,
								className: "btn btn-primary btn-sm glyphicon glyphicon-" + ("video"===data.is ? "facetime-video" : "earphone")
							}
						),
						this.button(
							{
								className: "btn btn-default btn-sm glyphicon glyphicon-off",
								onclick: this.cancel_action
							}
						)
					)
				)
			)
		}
	});
	return dom;
};
},{"./video":72,"vn/lib/dom":22,"vn/lib/is":27,"vn/model/user":35}],74:[function(require,module,exports){
var Box = require("./waiting-box");
var $ = require("vn/lib/dom");

module.exports = function(){
	var list = [];
	var dom = $({
		controller: {
			addCalling: function(data){
				if(-1 !== list.indexOf(data.receiver)) return;

				list.push(data.receiver);
				this.append(Box(data, function(called, receiver){
					var i = list.indexOf(receiver);
					list.splice(i, 1);

					if(!list.length) dom.remove();
				}));
			}
		},
		close_action: function(){
			dom.remove();
		},
		render: function(){
			return this.div({className: "modal", id: "call-chat-notify"},
				this.div({className: "modal-box"},
					this.div({className: "modal-content"},
						this.header("Calling is waiting"),
						this.section({controller: "addCalling", className: "list-group", id: "call-chat-notify-section"}),
						this.footer({className: "clearfix"},
							this.button({className: "btn btn-default btn-sm pull-right", onclick: this.close_action}, "Close")
						)
					)
				)
			)
		}
	});
	return dom;
};
},{"./waiting-box":73,"vn/lib/dom":22}],75:[function(require,module,exports){
var $ = require("vn/lib/dom");
var app = require("vn/lib/router");

var CommentForm = require("./form");
var ListReply = require("../reply/list");
var TextContent = require("../post/text-content");
var MediaContent = require("./media-content");

function CommentBox(post, comment){
	var auth = comment.auth;
	var dom_name = "c"+comment.id;

	var form = null;

	var dom = $({
		controller: {
			index: -1,
			limit_reply: 5, 
			listReply: ListReply(post, comment, function(count_reply){}),
			formReply: CommentForm(function(reply){
				comment.pushCount("reply");

				$.ajax({ 
					url: host.data+"/reply", 
					type: "post", 
					data: comment.dataReply(user, reply, post.id, post.t)
				});

				dom.emit("Reply", comment.count("reply"));
			}).set("inputHeight", 25).changeClass("form-comment", "form-reply"),
			link_next_reply: function(){
				var a = document.createElement("a"), box = this;
				a.onclick = function(e){ box.loadReply() };
				a.innerHTML = "Load next page";
				var div = document.createElement("div");
				div.className = "link-next-reply";
				div.appendChild(a);
				return div;
			},
			buttonLike: function(data){
				if(data.auth===auth.id && data.liked) console.log("show notify like comment to %s", auth.name);

				if(user.id!==data.user) return;
				comment.liked = data.liked;
				data.liked ? this.addClass(data.liked) : this.removeClass(data.from);
			},
			Like: function(data){
				comment.setCount(data.liked, data.count.liked);
				comment.setCount(data.from, data.count.from);

				var option = data.liked||data.from, count = comment.countLike();
				this.html(count).parent().css({display: count===0 ? "none" : "inline-block"});
				dom.children(option).attr("class", "glyphicon " + comment.getIconLike(option));
			},
			Comment: function(count_reply){
				/* update count reply */
			},
			addComment: function(data){
				/* add reply */
				if(!dom.loadedFormReply) return;
				var listReply = dom.get("listReply").emit("addReply", data);
				if(!dom.loadedReply) listReply.insertBefore(dom.get("formReply"));
			},
			loadReply: function(){
				var footer = dom.children("footer");
				var listReply = this.listReply;
				var link_next_reply = dom.children("link-next-reply");
				var box = this;

				$.ajax({
					url: host.data + "/reply",
					type: "get",
					data: { 
						user: user.id, 
						post: post.id, 
						t: post.t, 
						comment: comment.id, 
						limit: dom.get("limit_reply"), 
						index: dom.get("index")
					},
					success: function(data){
						if(!data.message) return;

						listReply.call("addList", post, data.message);
						if(!dom.loadedReply) footer.prepend(listReply);
						
						// if(comment.count("reply") < data.message.count_reply) dom.emit("Reply", data.message.count_reply);

						box.index = data.message.index;
						dom.loadedReply = true;

						if(data.message.index > 0){
							if(!link_next_reply) dom.setChild("link-next-reply", box.link_next_reply());
							return dom.children("footer").prepend(dom.children("link-next-reply"));
						};
						if(link_next_reply) link_next_reply.remove();
					}
				});
			},
			showReply: function(){
				if(post.deleted) return;
				if(dom.loadedFormReply) return this.formReply.call("show_footer", true);

				this.loadReply();/* load ajax list comment then show form comment */
				dom.children("footer").append(this.formReply.call("show_footer"));/* only show form comment */
				dom.loadedFormReply = true;
			}
		},
		button_like: function(){
			if(post.deleted) return;
			if(comment.deleted) return;
			var like_option = "like";
			var nextLike = comment.liked ? comment.unLike() : comment.Like(like_option);
			if(!nextLike) return;

			var data = comment.dataLike(user.id, post.id, post.t);
			dom.emit("Like", data).emit("buttonLike", data);

			if(comment.clickLike()<4) $.ajax({ url: host.data + "/comment/like", type: "put", data: data });
		},
		button_reply: function(){
			dom.call("showReply");
			dom.get("formReply").call("show_footer", true);
		},
		router_user: function(){
			return app.go(this);
		},
		render: function(){
			return this.li({className: "comment form"}, function(li){ li.attr("name", dom_name) },
					this.header({className: "relative"},
						/* avatar */
						this.div({className: "absolute img i32 comment", onclick: this.router_user.bind(auth.url)},
							this.img(auth.avatar)
						),

						/* content */
						this.div({className: "form-text no-border"},
							/* comment user name and content */
							this.div({className: "user-name comment-name"},
								this.a({onclick: this.router_user.bind(auth.url)}, auth.name)
							),
							this.div({className: "comment-content"},
								function(div){
									if(comment.text) div.append(TextContent(comment.text));
									if(comment.file) div.append(MediaContent(comment.file, comment.type));
								}
							)
						)
					),
					/* link like and time */
					this.section({className: "form-section"},
						this.button(
							{
								className: "comment-link " + comment.liked, 
								controller: "buttonLike", 
								onclick: this.button_like
							}, 
							this.span("Like")
						),
						this.span({ className: "comment-link font-small", style: comment.countLike() ? "display: inline-block" : "display: none" }, 
							function(span){
								var map = ["like"];
								for(var i=0, n=map.length; i<n; i++){
									span.append(this.span({node: map[i], className: "glyphicon "+comment.getIconLike(map[i])}));
								}
							}.bind(this),
							this.span({controller: "Like"}, comment.countLike())
						),
						this.span({className: "dot-small"}, "·"),
						this.span({className: "comment-link link-time comment-time"}, function(span){
							comment.getTime(function(time){ span.html(time) });
						}),
						this.span({className: "dot-small"}, "·"),
						this.button({className: "comment-link", onclick: this.button_reply}, "Reply"),
						function(section){
							if(!comment.count("reply")) return;
							section.append(this.span({className: "dot-small"}, "·"));
							section.append(this.span({className: "comment-link"}, comment.count("reply")));
						}.bind(this)
					),
					this.footer()
				)
		}
	});

	return dom;
};
module.exports = CommentBox;
},{"../post/text-content":99,"../reply/list":101,"./form":77,"./media-content":80,"vn/lib/dom":22,"vn/lib/router":28}],76:[function(require,module,exports){
var $ = require("vn/lib/dom");

module.exports = function ButtonDeleteMedia(fn){
	var dom, question;

	question = $({
		yes: function(){
			fn();
			dom.remove();
		},
		no: function(){
			dom.call("restore");
			question.remove();
		},
		render: function(){
			return this.span({className: "question-delete-media"}, 
				"Are you sure?", 
				this.a({onclick: this.yes}, "Yes"), 
				this.a({onclick: this.no}, "no")
			)
		}
	});
	dom = $({
		controller: {
			restore: function(){
				dom.append(dom.children("trash"));
				dom.clicked = false;
			}
		},
		before_delete: function(){
			if(!dom.clicked){
				dom.append(question).children("trash").remove();
				dom.clicked = true;
			}
		},
		render: function(){
			return this.button({className: "btn btn-default btn-sm pull-left btn-glyphicon button-delete-media", onclick: this.before_delete}, 
				this.span({className: "glyphicon glyphicon-trash", ariaHidden: true, node: "trash"})
			)
		}
	});
	return dom;
};
},{"vn/lib/dom":22}],77:[function(require,module,exports){
var cache = require("vn/lib/cache");
var $ = require("vn/lib/dom");

var FormComment = require("vn/form/comment");
var Modal = require("vn/plugin/modal");
var ViewPhoto = require("../post/review-photo");
var ViewVideo = require("./review-video");
var timer = require("vn/lib/time");
var ButtonDeleteMedia = require("./button-delete-media");

module.exports = function CommentForm(submit_action){
	var form = null;
	
	var dom = $({
		controller: {
			inputHeight: 32,
			show_footer: function(focus){
				if(cache.get("writing-form")) return $("body").prepend(Modal({
					header: "An editor is working",
					section: "You have wrote a comment or reply",
					yes: function(){ cache.get("is-form").emit("done") }
				}));
				if(focus) dom.children("content").focus();
				if(form) return;

				dom.children("footer").show();
				form = new FormComment(user.id);
			}
		},
		show_footer: function(){
			if(cache.get("writing-form")) return $("body").prepend(Modal({
				header: "An editor is working",
				section: "You have wrote a comment or reply",
				yes: function(){ cache.get("is-form").emit("done") }
			}));
			if(form) return;

			dom.children("footer").show();
			form = new FormComment(user.id);
			cache.set("writing-form", true).cache.set("is-form", dom);
		},
		handle_submit: function(e){
			e.preventDefault();

			if(!form.done()) return;
			
			submit_action(form);

			dom.emit("done");
		},
		button_upload: function(){
			var btn = $(this);
			btn.children(1).click();
			dom.children("button_smile").remove();
			dom.children("button_submit").disable(true);
			btn.remove();
		},
		upload_image: function(file){
			function remove_action(){
				form.remove("file").remove("type");
				dom.children("footer")
				   .prepend(dom.children("button_smile"))
				   .prepend(dom.children("button_upload"))
				;
			};
			var img = ViewPhoto([cdn["0"], "css/icon", "load-ring.gif"], remove_action);
			dom.children("section").append(img);

			$.ajax({
				url: host.upload+"/comment-photo",
				data: file,
				type: "post",
				success: function(info){
					var path = ["photo", "comment", info.folder, info.file].join("/");

					form.set("file", {
						id: info.id,
						host: CDN,
						path: path
					});

					img.call("change", host.upload+"/"+path);
					dom.children("button_submit").disable(false);
				},
				progress: function(percent){
					img.call("progress", percent);
				}
			});
		},
		upload_media: function(file){
			var section = dom.children("section");
			var footer = dom.children("footer");
			var file_type = file.type.split("/")[0];
			var temp_video = URL.createObjectURL(file);
			dom.media = ViewVideo(temp_video, file_type, remove_action);
			dom.button_remove_media = ButtonDeleteMedia(function(){
				remove_action();
				dom.media.call("remove");
				footer.prepend(dom.children("button_upload"));
			});

			function remove_action(){
				form.remove("file");
				dom.children("footer").prepend(dom.children("button_smile"));
			};

			dom.children("section").append(dom.media);
			footer.prepend(dom.button_remove_media);

			$.ajax({
				url: host.upload+"/post-"+file_type,
				type: "post",
				data: file,
				success: function(info){
					form.set("file", {
						id: info.id,
						host: CDN,
						path: [file_type, info.folder, info.file].join("/")
					});
					dom.children("button_submit").disable(false);
				},
				progress: function(percent){
					dom.media.call("progress", percent);
				}
			});
		},
		upload_action: function(e){
			var files = e.target.files, index = files.length-1, file = files[index];
			if(!file) return;

			form.set("type", file.type.split("/")[0]);
			var method_upload = form.get("type")==="image" ? this.upload_image : this.upload_media;

			if(file.size > form.size) return;
			method_upload(file);

			e.target.value = "";
		},
		write_action: function(e){
			this.style.height = dom.get("inputHeight")+"px";
			this.style.height = (this.scrollHeight+2) + "px";
			dom.children("header").height(this.style.height);

			form.set("text", this.value);

			if(13 === e.keyCode){
				if(!e.shiftKey && cache.getLocal("enter_comment")&&form.done()) return dom.children("button_submit").click();
			}
		},
		enter_comment: function(){
			cache.setLocal("enter_comment", !cache.getLocal("enter_comment"));
			dom.children("button_submit").toggle();
		},
		render: function(){

			var pull_left = "btn btn-default btn-sm pull-left", 
				pull_right = "btn btn-sm pull-right btn-",
				enter_comment = !!cache.getLocal("enter_comment")
			;

			return this.form({file: true, className: "form form-comment", onsubmit: this.handle_submit.bind(this)}, 
				this.header({className: "relative"},
					this.div({className: "absolute img img-avatar i32 form"}, this.img(user.avatar)),
					this.div({className: "form-text"}, 
						this.textarea({
							node: "content", 
							className: "input-text", 
							onkeyup: this.write_action, 
							onmousedown: this.show_footer,
							placeholder: "Enter content"
						})
					)
				),
				this.section({className: "clearfix"}),
				this.footer({className: "clearfix", hidden: true},
					this.button({className: pull_left, onclick: this.button_upload, node: "button_upload"}, 
						this.glyphicon("glyphicon-picture"),
						this.input({type: "file", onchange: this.upload_action.bind(this), node: "upload"})
					),
					this.button({className: pull_left, node: "button_smile"}, this.glyphicon("glyphicon-heart")),
					this.submit(
						{
							className: pull_right+"primary form-btn", 
							node: "button_submit", 
							hidden: enter_comment, 
							style: enter_comment ? "display: none" : ""
						}, 
						"Post"
					),
					this.label(
						{
							className: "pull-right enter-option enter-comment", 
							onclick: this.enter_comment
						}, 
						this.input({
							type: "checkbox",
							node: "enter_comment", 
							className: "enter-comment-btn", 
							checked: enter_comment
						})
					)
				)
			)
		}
	});

	dom.on("done", function(){
		var h = dom.get("inputHeight");
		form = new FormComment(user.id);
		dom.children("content").height(h).focus().empty();
		dom.children("header").height(h+2);
		dom.children("section").html("");
		if(dom.button_remove_media){
			dom.media.call("remove");
			dom.children("footer").prepend(dom.children("button_upload"));
			dom.button_remove_media.remove();
		};
		cache.del("writing-form").del("is-form");
	});

	return dom;
};


},{"../post/review-photo":96,"./button-delete-media":76,"./review-video":81,"vn/form/comment":14,"vn/lib/cache":18,"vn/lib/dom":22,"vn/lib/time":29,"vn/plugin/modal":36}],78:[function(require,module,exports){
var $ = require("vn/lib/dom");

module.exports = function CommentPhoto(data){
	var img = new Image();
	img.src = cdn[data.data.host] + "/" + data.data.path;

	var dom = $({
		render: function(){
			return this.canvas({className: "img"}, function(canvas){
				var cv = canvas.s, w = 230;
				var context = cv.getContext("2d");
				setTimeout(fn, 50);

				function fn(){
					if(!img.width) return setTimeout(fn, 50);
					var iw = img.width, ih = img.height;
					if(ih/iw >= 1.5) w = 200;

					cv.height = ih*w/iw;
					context.drawImage(img, 0, 0, w, cv.height);
					img.remove();
				}
			})
		}
	});
	return dom;
};
},{"vn/lib/dom":22}],79:[function(require,module,exports){
var $ = require("vn/lib/dom");

var Comment = require("vn/model/comment");
var CommentBox = require("./box");

module.exports = function CommentList(post_id){
	var dom = $({
		controller: {
			addList: function(post, data){
				var comments = data.comment;
				var users = data.user;
				var user_data = {};
				var comment = null;
				var ul = $(document.createElement("ul"));

				for(var i=0, n=users.length; i<n; i++){
					user_data[users[i].id] = JSON.parse(users[i].data);
				};
				for(var i in comments){
					(function(i){
						comment = new Comment(comments[i]);
						comment.setAuth(user_data[comment.user]);

						ul.append(CommentBox(post, comment));
					})(i)
				};
				dom.prepend(ul.attr("class", "list list-comment"));
			},
			addComment: function(data){
				var comment = new Comment(data.comment);
				comment.setAuth(data.user);
				this.append(CommentBox(data.post, comment));
			}
		},
		render: function(){
			return this.div({className: "comment-" + post_id},
				this.ul({className: "list list-comment", controller: "addComment"})
			)
		}
	});
	return dom;
};
},{"./box":75,"vn/lib/dom":22,"vn/model/comment":31}],80:[function(require,module,exports){
var Video = require("../app/media/video");
var Music = require("../app/media/audio");
var Image = require("./image");

module.exports = function MediaContent(file, type){
	var data = {data: file};
	switch(type){
		case "image": return Image(data);
		case "video": return Video(data);
		case "audio": return Music(data);
		default: return "";
	}
};
},{"../app/media/audio":60,"../app/media/video":66,"./image":78}],81:[function(require,module,exports){
var cache = require("vn/lib/cache");
var $ = require("vn/lib/dom");

var Video = require("../app/media/video");
var Audio = require("../app/media/audio");
var body = $("body");
function getLink(array, resize){
	array[0] = cdn[CDN];
	return array.join("/");
};

module.exports = function ReviewMedia(link_video, type, remove_action, success_action){
	var dom = $({
		controller: {
			progress: function(percent){
				var p = dom.children("progress").css("width", percent+"%");
				if(percent===100) p.parent().remove();
			},
			remove: function(){
				dom.remove();
				var video = cache.get("playing");
				if(video) video.call("pause");
			}
		},
		showVideo: function(div){
			var Media = "video"===type ? Video : Audio;
			div.append(Media({data: link_video}));
		},
		render: function(){
			return(
				this.div({className: "post-review-media"}, this.showVideo,
					this.div({className: "progress"}, this.div({node: "progress"}))
				)
			)
		}
	});
	return dom;
};
},{"../app/media/audio":60,"../app/media/video":66,"vn/lib/cache":18,"vn/lib/dom":22}],82:[function(require,module,exports){
var $ = require("vn/lib/dom");
var cache = require("vn/lib/cache");
var cookie = require("vn/lib/cookie");
var Template = require("../../template/index");
var PageNotFound = require("vn/plugin/page-not-found");

var User = require("vn/model/user");

module.exports = function(){
	if(cookie.has("uid")&&cookie.has("act")){
		window.user = new User(cache.getLocal("user").toArray());
		require("vn/socket");
		main.html(Template(PageNotFound));
	}else{
		main.html("Error Page When Not Login");
	}
};
},{"../../template/index":52,"vn/lib/cache":18,"vn/lib/cookie":20,"vn/lib/dom":22,"vn/model/user":35,"vn/plugin/page-not-found":37,"vn/socket":39}],83:[function(require,module,exports){
var $ = require("vn/lib/dom");

var Template = require("../../template/index");
var FormPost = require("../post/form");
var ListPost = require("../user/feed");
var getUserMedia = require("vn/lib/get-user-media");

function VideoCall(){
	var video = document.createElement("video");
	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");
	var repeat = 100;

	function error(e){
		console.log(e);
	};

	function success(stream){
		console.log(stream);
		// chatio.emit("test-video-call", stream);
		video.src = window.URL.createObjectURL(stream);
		video.play();

		// var recorder = new MediaRecorder(stream);

		// recorder.addEventListener('dataavailable', function (ev) {
  //       	console.log(ev.data)
  //     	});

		// console.log(recorder);
	};

	getUserMedia({video: true}).then(success).catch(error);

	// function callback(){
		// context.drawImage(video, 0, 0, context.width, context.height);
		// socket.emit("video-call", canvas.toDataURL("image/webp"));
	// };

	// setInterval(callback, repeat);

	return video;
};

module.exports = function(){
	return Template($({
		clickInput: function(){
			$("input[type=file]").click();
		},
		render: function(){
			return this.div(null, FormPost(), ListPost()) // 
		}
	}));
};
},{"../../template/index":52,"../post/form":91,"../user/feed":104,"vn/lib/dom":22,"vn/lib/get-user-media":25}],84:[function(require,module,exports){
var $ = require("vn/lib/dom");
var app = require("vn/lib/router");
var cookie = require("vn/lib/cookie");
var cache = require("vn/lib/cache");
var Template = require("../../template/index");

module.exports = function(){
	return Template($({
		profile: function(){
			app.go(user.url);
		},
		logout: function(){
			cookie.remove(["uid", "act"]);
			cache.removeLocal("user");
			app.go("/");
		},
		render: function(){
			return this.div(null, 
				this.ul({className: "list-group list-menu"},
					this.li({className: "list-group-item clearfix user-avatar"}, 
						this.span({className: "pull-left user-avatar md"}, this.img(user.avatar)), 
						this.a({className: "pull-left", onclick: this.profile}, user.name)
					)
				),
				this.ul({className: "list-group list-menu"},
					this.li({className: "list-group-item"}, this.glyphicon("glyphicon-off"), this.a({onclick: this.logout}, "Logout"))
				)
			)
		}
	}));
}
},{"../../template/index":52,"vn/lib/cache":18,"vn/lib/cookie":20,"vn/lib/dom":22,"vn/lib/router":28}],85:[function(require,module,exports){
var app = require("vn/lib/router");
var $ = require("vn/lib/dom");

var timer = require("vn/lib/time");
var chatId = require("vn/lib/chat-id");

function MessageView(content, receiver, watched){
	var chat_room = chatId([user.id, receiver.id]);
	
	chatio.emit("add-room-chat", chat_room);

	var dom = $({
		controller: {
			chat: function(data){
				this.html(data.text);
			}
		},
		render: function(){
			return this.li({id: "list-chat-" + chat_room}, 
				this.a(
					{
						className: "clearfix review-message list-group-item",
						onclick: function(e){
							app.go("/message/" + receiver.id);
						}
					},
					this.div({className: "pull-left user-avatar"}, this.img("/asset/image/avatar/female.jpg")),
					this.div({className: "pull-left"}, 
						this.div({className: "bold"}, receiver.name),
						function(div){ if(watched) div.append(this.glyphicon("glyphicon-ok")) }.bind(this),
						this.div({className: "message-info-text", controller: "chat"}, content.text)
					),
					this.div({className: "pull-right font-smaller"}, function(div){
						var d = new Date(content.time);
						div.html(timer.fixtime(d.getHours()) + ":" + timer.fixtime(d.getMinutes()))
					})
				)
			)
		}
	});
	return dom;
};
module.exports = MessageView;
},{"vn/lib/chat-id":19,"vn/lib/dom":22,"vn/lib/router":28,"vn/lib/time":29}],86:[function(require,module,exports){
var $ = require("vn/lib/dom");

var Template = require("../../template/index");
var Box = require("./box");

module.exports = function(){
	var User = require("vn/model/user");
	var user_data = {};

	var dom = $({
		loadMessageFromServer: function(ul){
			$.ajax({
				url: host.chat + "/chat/list",
				type: "get",
				data: { user: user.id, limit: 10, index: 0 },
				dataType: "object",
				success: function(data){
					if(!data.error){
						data = data.message;
						var i = 0, n = data.length, sender, receiver, receiver_id;
						for(; i < n; i++){

							sender = JSON.parse(data[i].sender);
							if(!user_data[sender.id]) user_data[sender.id] = new User(sender);

							receiver = JSON.parse(data[i].receiver);
							if(!user_data[receiver.id]) user_data[receiver.id] = new User(receiver);

							receiver_id = sender.id != user.id ? sender.id : receiver.id;

							ul.append(Box(JSON.parse(data[i].content), user_data[receiver_id], data[i].watch));
						}
					}
				}
			});
		},
		render: function(){
			return this.div({className: "message-index", id: "message"}, 
				this.ul({className: "list-message-index", id: "message_index"}, this.loadMessageFromServer)
			)
		}
	});

	return Template(dom);
};
},{"../../template/index":52,"./box":85,"vn/lib/dom":22,"vn/model/user":35}],87:[function(require,module,exports){
var map_action 	= ["like", "comment", "reply", "share"];
var map_table 	= ["post", "image", "video", "audio"];

module.exports = function(data){
	// var user_action = new User(JSON.parse(data.user_action));

	// var dom = $({
	// 	redirect: function(){
	// 		app.go("/");
	// 	},
	// 	render: function(){
	// 		return this.div({className: "list-group-item"},
	// 			this.div({className: "clearfix", onmousedown: this.redirect},
	// 				this.div({className: "pull-left"},
	// 					this.div({className: "user-avatar md"}, 
	// 						this.img(user_action.avatar)
	// 					)
	// 				),
	// 				this.div({className: "pull-left"},
	// 					this.span({className: "b"}, user_action.name),
	// 					this.span(data.action_name),
	// 					this.span(data.a)
	// 					"Nguyen Chi", " thich", " binh luan", " cua ban"
	// 				),
	// 				this.div({className: "pull-right"})
	// 			)
	// 		)
	// 	}
	// });
	return "dom";
};
},{}],88:[function(require,module,exports){
var $ = require("vn/lib/dom");

var Template = require("../../template/index");
var Box = require("./box");

module.exports = function(){
	var dom = $({
		controller: {
			addList: function(data){
				if(true){
					// update dom and prepend it to the list
				}else{
					// prepend it
				}
			}
		},
		loadListFromServer: function(div){
			div.append(Box());
			// $.ajax({
			// 	url: host.data + "/notification/list",
			// 	type: "get",
			// 	data: {
			// 		user: user.id,
			// 		limit: 20,
			// 		index: -1
			// 	},
			// 	dataType: "object",
			// 	success: function(data){
			// 		if(!data.error){

			// 		}
			// 	}
			// });
		},
		render: function(){
			return this.div({id: "notification"}, 
				this.div({className: "list-group", controller: "addList"}, this.loadListFromServer)
			)
		}
	});
	return Template(dom);
};

// - Thuy Chi - thich 			- anh 	=> 	["like", "image", "1"]
// - Thuy Chi - da binh luan 	- anh 	=> 	["comment", "image", "1", "10"];

// - Thuy Chi - thich 			- binh luan 	=> ["like", "image", "1", "10"];
// - Thuy Chi - da tra loi 	- binh luan  	=> ["reply", "image", "1", "10", "12"];

// - Thuy Chi - thich 			- phan hoi 		=> ["like", "image", "1", "10", "12"];

// =>	["$action", "$table", "$post-id", "$comment-id", "$replies-id"]

// map_action 	= ["like", "comment", "reply", "share"];
// map_table 	= ["post", "image", "video", "audio"];

},{"../../template/index":52,"./box":87,"vn/lib/dom":22}],89:[function(require,module,exports){
var $ = require("vn/lib/dom");

module.exports = function(user, callback){
	var dom = $({
		find_friend: function(e){
			console.log(this.value);
		},
		render: function(){
			return(
				this.div({className: 'form-add-friend'},
					this.div({hidden: true, node: 'input-friend'}),
					this.input({className: 'link-time input-add-friend', placeholder: 'Add your friends', onkeyup: this.find_friend}),
					this.div({className: 'relative', node: 'list-user'})
				)
			)
		}
	});
	return dom;
};
},{"vn/lib/dom":22}],90:[function(require,module,exports){
var $ = require("vn/lib/dom");
var cache = require("vn/lib/cache");
var async = require("vn/lib/async");
var app = require("vn/lib/router");

var html = require("./html");
var ButtonLike = require("./like-button");
var MediaContent = require("./media-content");
var FormPost = require("./form");
var ButtonShare = require("../share/button");
var TextContent = require("./text-content");

var FormComment = require("../comment/form");
var ListComment = require("../comment/list");

var Modal = require("vn/plugin/modal");

var Post = require("vn/model/post");

function PostBox(post){
	var auth = post.auth;
	var dom_name = "p" + post.id;

	var dom = $({
		controller: {
			index: -1,
			limit_comment: 5, 
			listComment: ListComment(post.id),
			formComment: FormComment(function(comment){
				post.pushCount("comment");

				$.ajax({ 
					url: host.data+"/comment", 
					type: "post", 
					data: post.dataComment(comment, user)
				});

				dom.emit("Comment", post.count("comment"));
			}),
			addComment: function(data){
				if(!dom.loadedFormComment) return;
				var listComment = dom.get("listComment").emit("addComment", data);
				if(!dom.loadedComment) listComment.insertBefore(dom.get("formComment"));
			},
			buttonLike: function(data){
				if(data.auth===auth.id && data.liked) console.log("show notify like post to %s", auth.name);

				if(user.id!==data.user) return;
				post.liked = data.liked;
				data.liked ? this.addClass(data.liked) : this.removeClass(data.from);
			},
			Like: function(data){
				post.hasLike = true;
				post.setCount(data.liked, data.count.liked);
				post.setCount(data.from, data.count.from);

				var option = data.liked||data.from, count = post.countLike();
				this.html(count).hidden(count===0);
				dom.children(option).attr("class", "glyphicon " + post.getIconLike(option));
			},
			Comment: function(count){ 
				var start = post.count("comment");
				post.hasComment = true;
				post.setCount("comment", count);
				if(start>1) this.children(1).html(count);
				else this.html(html.countComment(count));
			},
			Share: function(count){ 
				post.hasComment = true;
				post.count.share = count;
				if(count>1) this.children(1).html(count);
				else this.html(html.countShare(count));
			},
			View: function(count){ 
				post.hasComment = true;
				post.count.view = count;
				if(count>0) this.children(1).html(count);
				else this.html(html.countView(count));
			},
			loadComment: function(){
				var footer = dom.children("comment-location");
				var listComment = this.listComment;
				var box = this;
				$.ajax({
					url: host.data + "/comment",
					type: "get",
					dataType: "object",
					data: {
						user: user.id,
						post: post.id,
						t: post.t,
						limit: box.limit_comment,
						index: box.index
					},
					success: function(data){
						if(!data.message) return;

						listComment.call("addList", post, data.message);
						if(!dom.loadedComment) footer.prepend(listComment);
						
						if(post.count("comment") < data.message.count_comment) dom.emit("Comment", data.message.count_comment);

						box.index = data.message.index;
						dom.loadedComment = true;

						if(data.message.index > 0) return dom.children("comment-location").prepend(dom.link_next_comment);
						else dom.link_next_comment.remove();
					}
				});
			},
			showComment: function(){
				if(post.deleted) return;
				if(dom.loadedFormComment) return this.formComment.call("show_footer", true);

				this.loadComment();/* load ajax list comment then show form comment */
				dom.children("comment-location").append(this.formComment.call("show_footer"));/* only show form comment */
				dom.loadedFormComment = true;
			},
			setEdit: function(post){
				PostBox(new Post(post)).insertBefore(dom);
				dom.remove();
			}
		},
		button_like: function(){
			if(post.deleted) return;
			var like_name = "like";
			var nextLike = post.liked ? post.unLike() : post.Like(like_name);

			if(!nextLike) return;

			var data = post.dataLike(user.id);
			dom.emit("Like", data).emit("buttonLike", data);

			if(post.clickLike()<4){
				$.ajax({
					url: host.data + "/post/like",
					type: "post",
					data: data
				});
				if(data.liked) dom.call("showComment");
			}
		},
		show_like_button: function(){
			// dom.timeoutButtonLike = setTimeout(function(){
			// 	console.log("show_like_button");
			// }, 1200);
		},
		hide_like_button: function(){
			// clearTimeout(dom.timeoutButtonLike);
			// console.log("hide_like_button");
		},
		button_comment: function(){
			dom.call("showComment");
			dom.get("formComment").call("show_footer", true);
		},
		button_share: function(){
			var id = "menu-share-" + post.id;
			var btn = document.getElementById(id);

			if(btn){
				btn.remove();
				cache.del("menu", id);
			}else{
				dom.children("footer>div:nth-child(2)").append(ButtonShare(post, PostBox(post)));
				if(btn = document.getElementById(cache.get("menu"))) btn.remove();
				cache.set("menu", id);
			}
		},
		menu_link: function(e){
			e.preventDefault();
			var btn = dom.children('.btn-menu');
			if(dom.clicked_menu){
				dom.clicked_menu = false;
				btn.hide();
			}else{
				dom.clicked_menu = true;
				btn.show();
			}
		},
		edit_post: function(){
			var name = "modal-post";

			dom.children('.btn-menu').hide();
			dom.clicked_menu = false;
			
			if(cache.has(name)) return;
			cache.set(name, true);

			var form = FormPost();

			async([
				function(){
					if("post"===post.type){
						var modal = Modal({
							name: name,
							header: $({
								button_delete: function(){
									modal.call("remove");
								},
								render: function(){
									return this.div({className: "clearfix"}, 
										this.span("Chỉnh sửa bài viết"),
										this.button({className: "btn btn-default btn-sm btn-remove pull-right", onclick: this.button_delete}, "x")
									)
								}
							}),
							section: form.call("edit_text", post),
							footer: false
						});
						$("body").append(modal);
					}else{
						var post_text = dom.children(".post-text");
						var post_media = dom.children(".post-media");

						form.insertBefore(post_media);
						form.call("edit_media", post, function(){
							form.remove();
							cache.del(name);
							if(post_text) post_text.insertBefore(post_media);
						});
						if(post_text) post_text.remove();
					}
				}
			], 50);
		},
		delete_post: function(){
			var name = "modal-post";
			if(cache.has(name)) return;
			cache.set(name, true);

			var modal = Modal({
				name: name,
				header: 'Xóa bài viết',
				section: 'Bạn có chắc chắn muốn xóa bài viết này không?',
				yes: function(){
					console.log(post.toArray());
					// $.ajax({
					// 	url: host.data + "/post",
					// 	type: "delete",
					// 	data: post.toArray()
					// });
					document.getElementsByName(dom_name).forEach(function(it){ $(it).remove() });
				}
			});
			dom.addClass("relative").prepend(modal.css({position: "absolute"}));
		},
		router_user: function(){
			return app.go(this);
		},
		render: function(){
			return this.div({className: "post"}, function(li){ li.attr("name", dom_name) }, 
				this.header({className: "clearfix relative"}, 
					/* avatar and time */
					this.div({className: "pull-left clearfix"},
						this.div({className: "pull-left"},
							this.a({className: "img i40 post", onclick: this.router_user.bind(auth.url)},
								this.img(auth.avatar)
							)
						),
						this.div({className: "pull-left post-user"},
							this.div({className: "user-name post-user-name"}, 
								this.a({onclick: this.router_user.bind(auth.url)}, auth.name)
							),
							this.div({className: "link-time"}, function(div){
								post.getTime(function(time){div.html(time.toString())});
							})
						)
					),
					/* menu button */
					this.div({className: "pull-right post-menu"},
						this.a({className: "post-menu-btn", onclick: this.menu_link}, this.glyphicon("glyphicon-menu-down"))
					),
					/* menu list */
					this.ul({className: "absolute btn-menu"}, function(ul){
						// if(auth.id===user.id){
							ul.append(this.li({onclick: this.edit_post}, "Edit"));
							ul.append(this.li({onclick: this.delete_post}, "Delete"));
						// }
					}.bind(this))
				),
				this.section({className: "post-content"},
					function(section){
						if(post.text) section.append(TextContent(post.text));
						if(post.count("file")) section.append(MediaContent(post.file, post.type));
					}
				),
				this.footer({className: "post-footer relative"},
					this.div({className: "link-time post-count clearfix"},
						this.span({ className: "pull-left" }, 
							function(span){
								var map = ["like"];
								for(var i=0, n=map.length; i<n; i++){
									span.append(this.span({node: map[i], className: "glyphicon "+post.getIconLike(map[i])}));
								}
							}.bind(this),
							this.span({controller: "Like"}, post.countLike())
						),
						this.span({className: "pull-left", controller: "Comment"}, html.countComment(post.count("comment"))),
						this.span({className: "pull-right", controller: "Share"}, html.countShare(post.count("share"))),
						this.span({className: "pull-right", controller: "View"}, html.countView(post.count("view")), post.type)
					),
					this.div({className: "clearfix post-btn relative"},
						this.button(
							{
								className: "pull-left "+post.liked, 
								onclick: this.button_like, 
								// onmouseenter: this.show_like_button, 
								// onmouseleave: this.hide_like_button, 
								controller: "buttonLike"
							}, 
							this.glyphicon("glyphicon-thumbs-up"), 
							this.span("Like")
						),
						this.button({className: "pull-left", onclick: this.button_comment}, this.glyphicon("glyphicon-comment"), this.span("Comment")),
						this.button({className: "pull-left", onclick: this.button_share}, this.glyphicon("glyphicon-share-alt"), this.span("Share"))
					),
					this.div({node: "comment-location"})
				)
			)
		}
	});

	async([
		function(){
			var a = document.createElement("a"), div = document.createElement("div");
			a.onclick = function(e){ dom.call("loadComment") };
			a.innerHTML = "Load next page";

			div.className = "link-next-comment";
			div.appendChild(a);

			dom.link_next_comment = div;
		}
	]);

	return dom;
};
module.exports = PostBox;
},{"../comment/form":77,"../comment/list":79,"../share/button":102,"./form":91,"./html":92,"./like-button":93,"./media-content":94,"./text-content":99,"vn/lib/async":17,"vn/lib/cache":18,"vn/lib/dom":22,"vn/lib/router":28,"vn/model/post":33,"vn/plugin/modal":36}],91:[function(require,module,exports){
var $ = require("vn/lib/dom");
var cache = require("vn/lib/cache");
var hash = require("vn/lib/hash");
var timer = require("vn/lib/time");
var async = require("vn/lib/async");

var share_with = require("./share-with");
var AddFriend = require("./add-friend");
var ViewPhoto = require("./review-photo");
var ViewVideo = require("./review-video");

var Form = require("vn/form/post");

module.exports = function FormPost(){
	var form = null;
	var dom = $({
		controller: {},
		handle_submit: function(e){
			e.preventDefault();

			console.log(form);
			
			if(!form.done()) return false;

			// $.ajax({
			// 	url: host.data + "/post/add",
			// 	type: "post",
			// 	data: {
			// 		post: form.getData(),
			// 		user: user
			// 	}
			// });

			console.log(form.getData());

			this.hide_footer();
		},
		write_action: function(e){
			this.style.height = "30px";
			this.style.height = this.scrollHeight + "px";
			dom.children("header").height(this.scrollHeight);
			form.set("text", this.innerText);
		},
		show_footer: function(){
			if(form) return;
			dom.children("footer").show();
			form = new Form(user.id, user);
		},
		hide_footer: function(){
			dom.children("content").html("");
			dom.children("footer").hide();
			dom.children("section").html("");
			form = null;
		},

		/* working for upload */

		button_upload: function(){ 
			this.childNodes[1].click();
		},
		upload_image: function(file){
			form.file_uploading++;
			var file_name = hash.md5(file.name);
			var section = dom.children("section");
			var file_type = form.get("type");

			function remove_action(){
				form.removeFile(file_name);
			};
			function success_action(text){
				form.updateFile(file_name, "content", text);
			};

			var img = ViewPhoto([cdn["0"], "css/icon", "load-ring.gif"], remove_action, success_action);
			section.append(img);

			$.ajax({
				url: host.upload + "/post-photo",
				type: "post",
				data: file,
				success: function(info){
					var m = [CDN, "photo", "post", info.folder, info.file];
					form.updateFile(file_name, "id", info.id);
					form.updateFile(file_name, "data", m.join(","));
					form.file_uploaded++;
					img.call("change", m);
				},
				progress: function(percent){
					img.call("progress", percent);
				}
			});
		},
		upload_media: function(file){
			form.file_uploading++;
			var file_name = hash.md5(file.name);
			var section = dom.children("section");
			var file_type = form.get("type");
			var temp_video = URL.createObjectURL(file);

			function remove_action(){
				form.removeFile(file_name);
			};
			function success_action(text){
				form.updateFile(file_name, "content", text);
			};

			var vi = ViewVideo(temp_video, file_type, remove_action, success_action);
			section.append(vi);

			$.ajax({
				url: host.upload + "/post-"+file_type,
				type: "post",
				data: file,
				success: function(info){
					form.updateFile(file_name, "id", info.id);
					form.updateFile(file_name, "data", {host: CDN, path: [file_type, info.folder, info.file].join("/"), duration: duration});
					form.file_uploaded++;
				},
				progress: function(percent){
					vi.call("progress", percent);
				}
			});
		},
		upload_action: function(e){
			var files = e.target.files;

			if(files.length){
				if(!form.get("type")){
					form.set("type", files[0].type.split("/")[0]);
					form.method_upload = form.get("type")==="image" ? "upload_image" : "upload_media";
					e.target.setAttribute("accept", form.get("type"+"/*"));
				};
				var action = this[form.method_upload];
				var type = form.get("type");

				for(var i=0, n=files.length; i<n; i++){
					(function(file){
						var file_name = hash.md5(file.name);
						if(form.hasFile(file_name)) return false;
						if(file.type.split("/")[0]!==type) return false;
						if(file.size > form.size[type]) return false;
						form.addFile(file_name, { user: [user.id] });
						action(file);
					})(files[i])
				};
				dom.children("section").show();
			}
		},

		share_with: function(){
			if(dom.show_share_with){
				dom.show_share_with = false;
				share_with.remove();
			}else{
				dom.children("footer").append(share_with);
				dom.show_share_with = true;
			}
		},

		addFriend: function(){
			if(dom.clicked_addfriend){
				dom.addFriend.remove();
				dom.clicked_addfriend = false;
			}else{
				dom.children("section").append(dom.addFriend);
				dom.clicked_addfriend = true;
			}
		},

		paste: function(e){
			var node = null;
			if(node = $(this).find('img')) console.log(node);
		},

		render: function(){

			var pull_left = "btn btn-default btn-sm pull-left", 
				pull_right = "btn btn-sm pull-right btn-"
			;

			return this.form({file: true, className: "form form-post", onsubmit: this.handle_submit.bind(this)}, 
				this.header({className: "relative"},
					this.div({className: "absolute img i32 form", node: "avatar"}, this.img()),
					this.div({className: "form-text"}, 
						this.textarea({
							node: "content", 
							className: "input-text", 
							onkeyup: this.write_action, 
							onmousedown: this.show_footer,
							placeholder: "Enter content"
						})
					)
				),
				this.section({className: "clearfix"}),
				this.footer({className: "clearfix relative form-hide", hidden: true},
					this.button({className: pull_left, onclick: this.addFriend, node: "friend"}, this.glyphicon("glyphicon-user")),
					this.button({className: pull_left, onclick: this.button_upload, node: "upload"}, 
						this.glyphicon("glyphicon-picture"), 
						this.file(this.upload_action.bind(this), true)
					),
					this.button({className: pull_left, node: "feel"}, this.glyphicon("glyphicon-heart")),
					this.button({className: pull_left, node: "checkin"}, this.glyphicon("glyphicon-map-marker")),
					this.submit({className: pull_right+"primary form-btn", node: "submit"}, "Post"),
					this.button({className: pull_right+"default", onclick: this.share_with, node: "role"},
						this.span({node: "share_with"}, lang[(cache.getLocal("share_with")||"people")])
					)
				)
			)
		}
	});

	async([
		function(){
			share_with.on("change", function(i){
				share_with.remove();
				dom.show_share_with = false;
				cache.setLocal("share_with", i);
				dom.children("share_with").text(lang[i]);
			});
			dom.addFriend = AddFriend();
		},
		function(){
			dom.set("edit_text", function(post){
				dom.children("footer").show();
				form = new Form(user.id, user);
				form.set("text", post.text);

				dom.children("footer").html(dom.children("submit").html("Save"));
				dom.children("content").val(post.text).focus();
			});
		},
		function(){
			dom.set("edit_media", function(post, fn){
				var btn = document.createElement("button");
				var header = dom.children("header");

				dom.children("footer").show();
				form = new Form(user.id, user);
				form.set("text", post.text);

				btn.className = "btn btn-default pull-right";
				btn.type = "button";
				btn.innerHTML = "Cancel";
				btn.onclick = fn;

				dom.children("section").remove();

				header.find(0).remove();
				header.find(0).css("margin-left", "0px");
				dom.children("footer").html(dom.children("submit").html("Save")).append(btn);
				dom.children("content").val(post.text||"").focus();
			});
		}
	]);

	return dom;
}
},{"./add-friend":89,"./review-photo":96,"./review-video":97,"./share-with":98,"vn/form/post":16,"vn/lib/async":17,"vn/lib/cache":18,"vn/lib/dom":22,"vn/lib/hash":26,"vn/lib/time":29}],92:[function(require,module,exports){
module.exports = {
	countComment: function(count){
		if(count>0) return '<span class="glyphicon glyphicon-comment" aria-hidden="true"></span><span>'+count+'</span>';
		return '';
	},
	countShare: function(count){
		if(count>0) return '<span class="glyphicon glyphicon-share-alt" aria-hidden="true"></span><span>'+count+'</span>';
		else return '';
	},
	countView: function(count, type){
		if(count>0) return '<span class="glyphicon glyphicon-ok" aria-hidden="true"></span><span>'+count+'</span>';
		else return '';
	}
};
},{}],93:[function(require,module,exports){
var $ = require("vn/lib/dom");

module.exports = function(){
	var dom = $({
		render: function(){
			return this.div({className: ""})
		}
	});
	return dom;
};
},{"vn/lib/dom":22}],94:[function(require,module,exports){
var $ = require("vn/lib/dom");
var Playlist = require("../app/media/playlist");
var Photos = require("../app/media/photos");

module.exports = function(files, type){
	var Media = type==="image" ? Photos : Playlist;
	var textNode = document.createElement("div");

	return $({
		render: function(){
			return this.div({className: "post-media"}, Media(files, type, function(i){
				// var file = files[i];
				// if(file.text) textNode.innerHTML = file.text;
			}))
		}
	});
};
},{"../app/media/photos":63,"../app/media/playlist":64,"vn/lib/dom":22}],95:[function(require,module,exports){
var $ = require("vn/lib/dom");
var Modal = require("vn/plugin/modal");

var video = require("../app/media/video");
var audio = require("../app/media/audio");

module.exports = function(body, dom, remove_action, success_action){
	var type = dom.get("type");
	var modal = $({
		update_action: function(e){
			e.preventDefault();
			this.close_action();
			var t = modal.children("content");
			if(t&&success_action) success_action(t.text(), t.html());
		},
		delete_action: function(){
			var self = this;
			var box = Modal({
				section: "Are you readly?",
				yes: function(){
					self.close_action();
					dom.remove();
					box.remove();
					if(type!=="image") modal.children("media").children(".video-control").call("pause");
					return remove_action();
				},
				no: function(){
					box.remove();
					if(type!=="image") modal.children("media").children(".video-control").call("pause");
				}
			});
			modal.children("section").append(box);
		},
		close_action: function(){
			modal.remove();
			if(type!=="image") modal.children("media").children(".video-control").call("pause");
		},
		render: function(){
			return this.div({className: "modal"},
				this.div({className: "modal-box"},
					this.form({className: "modal-content", onsubmit: this.update_action.bind(this)},
						this.section(null, 
							function(div){
								if(dom.get("edit")) div.append(this.div({className: "form-text modal-edit-title"}, 
									this.text({node: "content", className: "input-text", dataset: {placeholder: "Enter content"}}, dom.get("html")||null)
								))
							}.bind(this),
							this.div({className: "modal-edit-image", node: "media"}, function(div){
								var src = dom.get("src");
								switch(type){
									case "image": div.append(this.img(src)); break;
									case "video": div.append(video({data: src, autoplay: true})); break;
									case "audio": div.append(audio({data: src, autoplay: true})); break;
								}
							}.bind(this))
						),
						this.footer({className: "clearfix"},
							this.button({className: "btn btn-default btn-sm pull-left btn-glyphicon", onclick: this.delete_action.bind(this)}, this.glyphicon("glyphicon-trash")),
							this.submit({className: "btn btn-primary btn-sm pull-right btn-glyphicon"}, this.glyphicon("glyphicon-ok")),
							this.button({className: "btn btn-default btn-sm pull-right btn-glyphicon", onclick: this.close_action}, this.glyphicon("glyphicon-remove"))
						)
					)
				)
			)
		}
	});
	return modal;
}
},{"../app/media/audio":60,"../app/media/video":66,"vn/lib/dom":22,"vn/plugin/modal":36}],96:[function(require,module,exports){
var $ = require("vn/lib/dom");

var modal = require("./review-modal");
var body = $("body");

function getLink(array, resize){
	array[0] = cdn[CDN];
	if(resize) array[2] = resize;
	return array.join("/");
};

module.exports = function(loading, remove_action, success_action){
	var dom = $({
		controller: {
			type: "image",
			change: function(array){
				if("string"===typeof array){
					dom.set("thumb", array).set("src", array);
				}else{
					dom.set("src", getLink(array));
					dom.set("thumb", getLink(array, "100"));
					dom.set("edit", true);
				};
				dom.children("img").attr("src", dom.get("thumb"));
			},
			progress: function(percent){
				var p = dom.children("progress").css("width", percent+"%");
				if(percent===100) p.parent().remove();
			}
		},
		edit_image: function(){
			if(dom.get("src")){
				body.append(modal(body, dom, remove_action, function(text, html){ 
					success_action(text); 
					dom.set("html", html); 
				}));
			}
		},
		render: function(){
			return(
				this.div({className: "relative post-review-image"},
					this.img({src: loading.join("/"), className: "pull-left", onclick: this.edit_image, node: "img"}),
					this.div({className: "absolute progress"}, this.div({node: "progress"}))
				)
			)
		}
	});
	return dom;
};
},{"./review-modal":95,"vn/lib/dom":22}],97:[function(require,module,exports){
var $ = require("vn/lib/dom");

var modal = require("./review-modal");
var body = $("body");

function getLink(array, resize){
	array[0] = cdn[CDN];
	return array.join("/");
};

module.exports = function(link_video, type, remove_action, success_action){
	var dom = $({
		controller: {
			type: type,
			src: link_video,
			progress: function(percent){
				var p = dom.children("progress").css("width", percent+"%");
				if(percent===100) p.parent().remove();
			}
		},
		edit_media: function(){
			body.append(modal(body, dom, remove_action, function(text, html){ 
				success_action(text); 
				dom.set("html", html); 
			}));
		},
		render: function(){
			return(
				this.div({className: "relative post-review-media"},
					this.div({className: "pull-left", onclick: this.edit_media, node: "media"}, this.glyphicon("glyphicon-"+(type==="video"?"film":"music"))),
					this.div({className: "absolute progress"}, this.div({node: "progress"}))
				)
			)
		}
	});
	return dom;
};
},{"./review-modal":95,"vn/lib/dom":22}],98:[function(require,module,exports){
var cache = require("vn/lib/cache");
var $ = require("vn/lib/dom");

var dom = $({
	people: function(){
		dom.emit("change", "people");
	},
	friend: function(){
		dom.emit("change", "friend");
	},
	me: function(){
		dom.emit("change", "me");
	},
	render: function(){
		return this.ul({className: "absolute menu"},
			this.button({className: "menu-down", onclick: this.people}, lang.people),
			this.button({className: "menu-down", onclick: this.friend}, lang.friend),
			this.button({className: "menu-down", onclick: this.me}, lang.me)
		)
	}
});
module.exports = dom;
},{"vn/lib/cache":18,"vn/lib/dom":22}],99:[function(require,module,exports){
module.exports = function(long_text){
	var div_text = document.createElement("div");
	var div_for_text = document.createElement("div");
	if(long_text.length > 400){
		var text = long_text.substr(0, 200) + " ...";

		var link_read_more = document.createElement("a");
		var link_short_text = document.createElement("a");
		var div_for_link = document.createElement("div");

		div_for_link.appendChild(link_read_more);
		div_for_text.innerText = text;

		link_read_more.innerHTML = "read more";
		link_short_text.innerHTML = "shortcut";

		link_read_more.onclick = function(){
			div_for_link.appendChild(link_short_text);
			div_for_text.innerText = long_text;
			link_read_more.remove();
		};
		link_short_text.onclick = function(){
			div_for_link.appendChild(link_read_more);
			div_for_text.innerHTML = text;
			link_short_text.remove();
		};

		div_text.appendChild(div_for_text);
		div_text.appendChild(div_for_link);
	} 
	else div_text.innerHTML = long_text;

	div_text.className = "post-text";
	return div_text;
};
},{}],100:[function(require,module,exports){
var $ = require("vn/lib/dom");
var app = require("vn/lib/router");

var TextContent = require("../post/text-content");
var MediaContent = require("../comment/media-content");

var ReplyBox = function(post, comment, reply){
	var auth = reply.auth;
	var dom_name = "r"+reply.id;

	var dom = $({
		controller: {
			buttonLike: function(data){
				if(data.auth===auth.id && data.liked) console.log("show notify like reply to %s", auth.name);

				if(user.id!==data.user) return;
				reply.liked = data.liked;
				data.liked ? this.addClass(data.liked) : this.removeClass(data.from);
			},
			Like: function(data){
				reply.setCount(data.liked, data.count.liked);
				reply.setCount(data.from, data.count.from);

				var option = data.liked||data.from, count = reply.countLike();
				this.html(count).parent().css({display: count===0 ? "none" : "inline-block"});
				dom.children(option).attr("class", "glyphicon " + reply.getIconLike(option));
			}
		},
		button_like: function(){
			if(reply.deleted) return;
			if(reply.deleted) return;
			var like_option = "like";
			var nextLike = reply.liked ? reply.unLike() : reply.Like(like_option);
			if(!nextLike) return;

			var data = reply.dataLike(user.id, post.id, post.t);
			dom.emit("Like", data).emit("buttonLike", data);

			if(reply.clickLike()<4) $.ajax({ url: host.data + "/reply/like", type: "put", data: data });
		},
		router_user: function(){
			return app.go(this);
		},
		render: function(){
			return this.li({className: "reply form"}, function(li){ li.attr("name", dom_name) },
					this.header({className: "relative"},
						/* avatar */
						this.div({className: "absolute img i25 reply", onclick: this.router_user.bind(this)},
							this.img(auth.avatar)
						),

						/* content */
						this.div({className: "form-text no-border"},
							/* reply user name and content */
							this.div({className: "user-name comment-name name md"},
								this.a({onclick: this.router_user.bind(this)}, auth.name)
							),
							this.div({className: "comment-content"},
								function(div){
									if(reply.text) div.append(TextContent(reply.text));
									if(reply.file) div.append(MediaContent(reply.file, reply.type));
								}
							)
						)
					),
					/* link like and time */
					this.section({className: "form-section"},
						this.button(
							{
								className: "comment-link " + reply.liked, 
								controller: "buttonLike", 
								onclick: this.button_like
							}, 
							this.span("Like")
						),
						this.span({ className: "comment-link font-small", style: reply.countLike() ? "display: inline-block" : "display: none" }, 
							function(span){
								var map = ["like"];
								for(var i=0, n=map.length; i<n; i++){
									span.append(this.span({node: map[i], className: "glyphicon "+reply.getIconLike(map[i])}));
								}
							}.bind(this),
							this.span({controller: "Like"}, reply.countLike())
						),
						this.span({className: "dot-small"}, "·"),
						this.span({className: "comment-link link-time comment-time"}, function(span){
							reply.getTime(function(time){ span.html(time) });
						})
					),
					this.footer()
				)
		}
	});
	return dom;
};
module.exports = ReplyBox;
},{"../comment/media-content":80,"../post/text-content":99,"vn/lib/dom":22,"vn/lib/router":28}],101:[function(require,module,exports){
var $ = require("vn/lib/dom");

var Reply = require("vn/model/reply");
var User = require("vn/model/user");

var Box = require("./box");

module.exports = function(post, comment){
	var dom = $({
		controller: {
			addList: function(comment, data){
				var replies = data.reply;
				var users = data.user;
				var user_data = {};
				var reply = null;
				var ul = $(document.createElement("ul"));

				for(var i=0, n=users.length; i<n; i++){
					user_data[users[i].id] = new User(JSON.parse(users[i].data));
				};
				for(var i in replies){
					(function(i){
						reply = new Reply(replies[i]);
						reply.auth = user_data[reply.user];

						ul.append(Box(post, comment, reply));
					})(i)
				};
				dom.prepend(ul.attr("class", "list list-reply"));
			},
			addReply: function(data){
				var reply = new Reply(data.reply);
				reply.auth = data.user;
				this.append(Box(post, comment, reply));
			}
		},
		render: function(){
			return this.div({className: "reply-" + comment.id},
				this.ul({className: "list list-reply", controller: "addReply"})
			)
		}
	});
	return dom;
};
},{"./box":100,"vn/lib/dom":22,"vn/model/reply":34,"vn/model/user":35}],102:[function(require,module,exports){
var $ = require("vn/lib/dom");
var ShareForm = require("./form");

module.exports = function(post, PostBox){
	var dom = $({
		controller: {
			remove: function(){
				dom.remove();
			},
			send: function(data){
				$.ajax({
					url: host.data + "/ajax/share",
					type: "post",
					data: {
						post: {
							id: post.id,
							user: post.auth.id,
							t: post.t,
							type: post.type
						},
						user: user.id,
						data: data||null
					}
				});
			}
		},
		write_post: function(){
			$("body").append(ShareForm(PostBox, function(data){
				dom.call("send", data);
			}));
			dom.call("remove");
		},
		share_now: function(){
			dom.call("send").call("remove");
		},
		send_message: function(){},
		render: function(){
			return this.ul({className: "menu menu-share absolute", id: "menu-share-" + post.id},
				this.li({onclick: this.write_post}, "Write post"),
				this.li({onclick: this.share_now}, "Share now"),
				this.li({onclick: this.send_message}, "Send message")
			)
		}
	});
	return dom;
};
},{"./form":103,"vn/lib/dom":22}],103:[function(require,module,exports){
var $ = require("vn/lib/dom");

module.exports = function(PostBox, callback){
	var dom = $({
		submit_form: function(e){
			e.preventDefault();
			callback(this.text.value);
			dom.remove();
		},
		close_action: function(e){
			dom.remove();
		},
		render: function(){
			return this.div({className: "modal"},
				this.div({className: "modal-box"},
					this.form({className: "modal-content form form-share", onsubmit: this.submit_form},
						this.header("Share post"),
						this.div({className: "form-text"}, 
							this.textarea({
								name: "text", 
								className: "form-control input-text",
								placeholder: "What want you say?"
							})
						),
						this.div(null, PostBox.remove("footer").remove(".post-menu")),
						this.footer({className: "clearfix"},
							this.submit({className: "btn btn-primary btn-sm pull-right"}, "Post"),
							this.button({className: "btn btn-default btn-sm pull-right", onclick: this.close_action}, "Close")
						)
					)
				)
			)
		}
	});
	return dom;
};
},{"vn/lib/dom":22}],104:[function(require,module,exports){
var $ = require("vn/lib/dom");
var Post = require("vn/model/post");
var PostBox = require("../post/box");

module.exports = function(){
	var dom = $({
		render: function(){
			return(
				this.div({id: "user_feed"}, function(div){
					$.ajax({
						url: host.data + "/user/feed",
						type: "get",
						dataType: "object",
						data: {
							id: user.id,
							token: user.token,
							page: 1
						},
						success: function(data){
							if(!data.message) return;
							data.message.forEach(function(post){
								div.append(PostBox(new Post(post)))
							});
						}
					});
				})
			)
		}
	});
	return dom;
}
},{"../post/box":90,"vn/lib/dom":22,"vn/model/post":33}],105:[function(require,module,exports){
var $ = require("vn/lib/dom");
var app = require("vn/lib/router");

var Template = require("../../template");

module.exports = function(auth){
	var isme = auth.id===user.id;

	var dom = $({
		question_change_avatar: function(){
			if(isme){
				alert('msg');
			}
		},
		add_friend: function(){
			alert('send add friend');
		},
		remove_friend: function(){
			alert('unfriend');
		},
		send_message: function(){
			app.go("/message/"+auth.id);
		},
		render: function(){
			return this.div({id: "user"},
				this.header({className: "relative"},
					this.div({className: "img img-cover"},
						this.img(auth.cover)
					),
					this.div({className: "absolute"},
						this.div({className: "clearfix"},
							this.div({className: "img i70 pull-left"}, 
								this.img({src: auth.avatar, onclick: this.question_change_avatar})
							),
							this.div({className: "pull-left"},
								this.div({className: "name name-lg"}, auth.name)
							)
						)
					)
				),
				this.section({className: "user", hidden: !!isme},
					isme ? "" : this.div(null, 
						auth.friend /* if is friend, then show unfriend, else show add friend */
						? this.button({className: "btn btn-default btn-sm", onclick: this.remove_friend}, this.glyphicon("glyphicon-ok"), this.span("Friend"))
						: this.button({className: "btn btn-default btn-sm", onclick: this.add_friend}, this.glyphicon("glyphicon-plus"), this.span("Add friend"))
					),
					isme ? "" : this.div(null, ""),
					isme ? "" : this.div(null, this.button({onclick: this.send_message, className: "btn btn-default btn-sm"}, 
						this.glyphicon("glyphicon-inbox"), this.span("Send message")
					))
				),
				this.footer("Show List Post")
			)
		}
	});
	return Template(dom);
};
},{"../../template":52,"vn/lib/dom":22,"vn/lib/router":28}]},{},[41])