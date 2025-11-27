# Third Space Vest Reverse Engineering Summary

> **Source**: Analysis of Kyle Machulis' reverse engineering work and TN Games SDK documentation.
>
> This document consolidates the key technical findings for quick reference.

## Overview

The Third Space Vest uses USB HID communication with **TEA encryption** to protect the protocol. However, the encryption has a critical flaw: **replay attacks work** and the same cache key can be reused forever.

## USB Device Info

| Property | Value |
|----------|-------|
| Vendor ID | `0x1BD7` |
| Product ID | `0x5000` |
| Protocol | USB HID |
| Packet Size | 10 bytes |
| Endpoints | EP1 OUT (write), EP2 IN (read) |

## Packet Structure

### Raw Packet (10 bytes)

```
┌──────┬─────────────┬────────────────────────────────┐
│ Byte │ Name        │ Description                    │
├──────┼─────────────┼────────────────────────────────┤
│ 0    │ Header      │ Always 0x02                    │
│ 1    │ Key Index   │ Cache key index (0-255)        │
│ 2-9  │ Payload     │ TEA-encrypted data (8 bytes)   │
└──────┴─────────────┴────────────────────────────────┘
```

### Decrypted Payload (8 bytes)

```
┌──────┬─────────────┬────────────────────────────────┐
│ Byte │ Name        │ Description                    │
├──────┼─────────────┼────────────────────────────────┤
│ 0-3  │ Reserved    │ Always 0x00 0x00 0x00 0x00     │
│ 4    │ Speed       │ Intensity (1-255)              │
│ 5    │ Cell Index  │ Air cell to activate (0-7)    │
│ 6    │ Checksum    │ CRC8-like checksum             │
│ 7    │ Reserved    │ Always 0x00                    │
└──────┴─────────────┴────────────────────────────────┘
```

## Cell Layout (Hardware Addressing)

```
      FRONT                    BACK
  ┌─────┬─────┐          ┌─────┬─────┐
  │  2  │  5  │  Upper   │  1  │  6  │
  │ TL  │ TR  │          │ TL  │ TR  │
  ├─────┼─────┤          ├─────┼─────┤
  │  3  │  4  │  Lower   │  0  │  7  │
  │ BL  │ BR  │          │ BL  │ BR  │
  └─────┴─────┘          └─────┴─────┘
    L     R                L     R
```

**Note**: SDK uses 1-based indexing (1-8), hardware uses 0-based (0-7) with a different layout!

### SDK Index to Hardware Index Mapping

| SDK Index | Location | Hardware Index |
|-----------|----------|----------------|
| 1 | Front Top Right | 5 |
| 2 | Front Top Left | 2 |
| 3 | Front Lower Right | 4 |
| 4 | Front Lower Left | 3 |
| 5 | Back Top Right | 6 |
| 6 | Back Top Left | 1 |
| 7 | Back Lower Right | 7 |
| 8 | Back Lower Left | 0 |

## TEA Encryption

The vest uses **Tiny Encryption Algorithm (TEA)** with:
- 64-bit block (8 bytes of payload)
- 128-bit cache key (16 bytes, formed as 4x uint32)
- Magic constant: `0x61C88647` (golden ratio variant)

### Critical Finding: Static Key Works!

**You can use the same cache key for every packet forever!**

```
Key Index: 0xD5 (213)
Cache Key: [0x35491600, 0x39047C32, 0x0E354D4B, 0x70252576]
```

This means:
1. No need to randomize keys per packet
2. No time-based seed required
3. Simplifies implementation significantly

### Cache Key Table

The SDK contains a 280-byte lookup table at address `0x4168F8` to generate cache keys. The key index (0-255) is used as an offset, and 16 consecutive bytes form the 128-bit key.

<details>
<summary>Full Cache Key Table (280 bytes)</summary>

```python
CACHE_KEY_TABLE = [
    0x55, 0x02, 0x15, 0x2E, 0x41, 0x3D, 0x0B, 0x6D, 0x17, 0x02, 0x5F, 0x24, 0x12, 0x3E, 0x6F, 0x5F,
    0x2E, 0x1C, 0x57, 0x6B, 0x27, 0x08, 0x71, 0x52, 0x7A, 0x2E, 0x5B, 0x62, 0x62, 0x7B, 0x70, 0x26,
    0x5B, 0x19, 0x4C, 0x6B, 0x21, 0x76, 0x4C, 0x3C, 0x31, 0x3E, 0x0A, 0x64, 0x46, 0x5B, 0x64, 0x72,
    0x5C, 0x7B, 0x75, 0x2F, 0x2F, 0x09, 0x1A, 0x29, 0x3C, 0x31, 0x6E, 0x2B, 0x3E, 0x60, 0x4D, 0x41,
    0x31, 0x41, 0x53, 0x37, 0x51, 0x40, 0x5C, 0x1A, 0x1B, 0x09, 0x05, 0x35, 0x49, 0x09, 0x29, 0x14,
    0x5A, 0x6A, 0x64, 0x03, 0x07, 0x1A, 0x13, 0x0F, 0x4E, 0x45, 0x51, 0x03, 0x69, 0x55, 0x7A, 0x6B,
    0x56, 0x78, 0x2A, 0x14, 0x51, 0x19, 0x3D, 0x08, 0x54, 0x64, 0x50, 0x15, 0x1D, 0x46, 0x3E, 0x46,
    0x27, 0x6A, 0x23, 0x68, 0x2F, 0x3C, 0x5C, 0x05, 0x2F, 0x68, 0x03, 0x6B, 0x65, 0x5B, 0x76, 0x26,
    0x4C, 0x3F, 0x51, 0x00, 0x21, 0x03, 0x6E, 0x07, 0x5E, 0x50, 0x6B, 0x06, 0x41, 0x13, 0x23, 0x09,
    0x45, 0x79, 0x32, 0x5C, 0x27, 0x6D, 0x75, 0x0C, 0x61, 0x1B, 0x06, 0x64, 0x31, 0x70, 0x43, 0x70,
    0x12, 0x17, 0x48, 0x7C, 0x41, 0x7C, 0x6F, 0x15, 0x38, 0x4B, 0x56, 0x06, 0x35, 0x71, 0x58, 0x5B,
    0x33, 0x19, 0x11, 0x61, 0x6F, 0x2F, 0x5D, 0x22, 0x63, 0x5F, 0x59, 0x6C, 0x4D, 0x15, 0x60, 0x4A,
    0x28, 0x7E, 0x0E, 0x09, 0x30, 0x05, 0x40, 0x33, 0x62, 0x57, 0x11, 0x16, 0x79, 0x5E, 0x5D, 0x3D,
    0x71, 0x48, 0x40, 0x75, 0x06, 0x00, 0x16, 0x49, 0x35, 0x32, 0x7C, 0x04, 0x39, 0x4B, 0x4D, 0x35,
    0x0E, 0x76, 0x25, 0x25, 0x70, 0x1F, 0x61, 0x62, 0x5C, 0x72, 0x1B, 0x37, 0x0D, 0x5B, 0x31, 0x30,
    0x7F, 0x07, 0x3F, 0x19, 0x6E, 0x61, 0x1F, 0x7F, 0x57, 0x16, 0x6F, 0x2D, 0x75, 0x10, 0x0A, 0x2F,
    0x44, 0x7D, 0x0C, 0x51, 0x00, 0x48, 0x52, 0x20, 0x26, 0x1D, 0x76, 0x67, 0x71, 0x69, 0x56, 0x32,
    0x5D, 0x57, 0x0E, 0x4E, 0x26, 0x53, 0x78, 0x45, 0x49, 0x09, 0x32, 0x65, 0x01, 0x66, 0x17, 0x39,
    0x4A, 0x14, 0x43, 0x0E, 0x60, 0x01, 0x13, 0x6F, 0x40, 0x59, 0x21, 0x27, 0x25, 0x06, 0x4B, 0x45,
    0x0B, 0x36, 0x2C, 0x12, 0x2E, 0x54, 0x21, 0x1C, 0x0B, 0x0C, 0x45, 0x2E, 0x5D, 0x4B, 0x74, 0x54,
    0x20, 0x3C, 0x4A, 0x5A, 0x10, 0x4B, 0x23, 0x4D, 0x2A, 0x24, 0x1C, 0x78, 0x28, 0x34, 0x10, 0x67,
    0x09, 0x25, 0x1B, 0x66, 0x06, 0x65, 0x1A, 0x02, 0x1D, 0x20, 0x28, 0x06, 0x08, 0x40, 0x21, 0x7E,
    0x45, 0x73, 0x21, 0x37, 0x10, 0x24, 0x04, 0x3B, 0x63, 0x7F, 0x67, 0x58
]
```

</details>

## Checksum Algorithm

A custom CRC8-like checksum using a 16-value lookup table:

```python
CRC8_TABLE = [
    0x00, 0x07, 0x0E, 0x09,
    0x1C, 0x1B, 0x12, 0x15,
    0x38, 0x3F, 0x36, 0x31,
    0x24, 0x23, 0x2A, 0x2D
]

def checksum(cell_index: int, speed: int) -> int:
    """Calculate checksum for command packet."""
    idx = cell_index & 0x0F
    a = (CRC8_TABLE[idx] << 4) & 0xFF
    b = (CRC8_TABLE[idx] >> 4) ^ (speed >> 4)
    c = a ^ CRC8_TABLE[b]
    d = (c << 4) & 0xFF
    return CRC8_TABLE[((c >> 4) ^ speed) & 0x0F] ^ d
```

## SDK Functions

### Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `SetUpJacket` | `int SetUpJacket(void)` | Initialize connection |
| `TearDownJacket` | `void TearDownJacket(void)` | Disconnect and cleanup |
| `SetEffect` | `int SetEffect(int nEffect)` | Send predefined effect |
| `SetEffect2` | `int SetEffect2(int speed, int actuator)` | Send custom effect |
| `FlushBuffer` | `void FlushBuffer(int actuator)` | Clear actuator buffer |
| `GetErrorCode` | `int GetErrorCode(void)` | Get last error code |
| `GetErrorText` | `char* GetErrorText(void)` | Get error description |

### Predefined Effects

| Effect Constant | Description |
|-----------------|-------------|
| `E_MACHINEGUN_FRONT` | Machine gun fire to front |
| `E_MACHINEGUN_BACK` | Machine gun fire to back |
| `E_BIG_BLAST_FRONT` | Large explosion to front |
| `E_BIG_BLAST_BACK` | Large explosion to back |
| `E_SMALL_BLAST_FRONT` | Small explosion to front |
| `E_SMALL_BLAST_BACK` | Small explosion to back |
| `E_PISTOL_FRONT` | Handgun fire to front |
| `E_PISTOL_BACK` | Handgun fire to back |
| `E_PUNCH_FRONT` | Punch to front |
| `E_PUNCH_BACK` | Punch to back |
| `E_STAB_FRONT` | Stab to front |
| `E_STAB_BACK` | Stab to back |
| `E_SHOTGUN_FRONT` | Shotgun fire to front |
| `E_SHOTGUN_BACK` | Shotgun fire to back |
| `E_RIFLE_FRONT` | Rifle fire to front |
| `E_RIFLE_BACK` | Rifle fire to back |
| `E_LEFT_SIDE_HIT` | Explosion to left side |
| `E_RIGHT_SIDE_HIT` | Explosion to right side |
| `E_ACCELERATION` | Acceleration feeling |
| `E_DECELERATION` | Deceleration feeling |
| `E_LEFTTURN` | Turning left |
| `E_RIGHTTURN` | Turning right |
| `E_ACCELERATION_STOP` | Stop acceleration |
| `E_DECELERATION_STOP` | Stop deceleration |
| `E_LEFTTURN_STOP` | Stop left turn |
| `E_RIGHTTURN_STOP` | Stop right turn |

## Implementation Reference

### Python Example (Conceptual)

```python
import struct
from typing import List

# Static key (works forever!)
KEY_INDEX = 0xD5
CACHE_KEY = [0x35491600, 0x39047C32, 0x0E354D4B, 0x70252576]

def tea_encrypt(data: List[int], key: List[int]) -> List[int]:
    """TEA encryption - 64-bit block, 128-bit key."""
    v0, v1 = data[0], data[1]
    delta = 0x9E3779B9  # or 0x61C88647
    sum_val = 0
    
    for _ in range(32):
        sum_val = (sum_val + delta) & 0xFFFFFFFF
        v0 = (v0 + (((v1 << 4) + key[0]) ^ (v1 + sum_val) ^ ((v1 >> 5) + key[1]))) & 0xFFFFFFFF
        v1 = (v1 + (((v0 << 4) + key[2]) ^ (v0 + sum_val) ^ ((v0 >> 5) + key[3]))) & 0xFFFFFFFF
    
    return [v0, v1]

def build_packet(cell: int, speed: int) -> bytes:
    """Build a complete 10-byte packet."""
    # Build plaintext (8 bytes)
    csum = checksum(cell, speed)
    plaintext = bytes([0, 0, 0, 0, speed, cell, csum, 0])
    
    # Convert to two uint32 for TEA
    v = list(struct.unpack('<II', plaintext))
    
    # Encrypt
    encrypted = tea_encrypt(v, CACHE_KEY)
    
    # Pack final packet
    return bytes([0x02, KEY_INDEX]) + struct.pack('<II', *encrypted)
```

## Comparison: Our Implementation vs SDK

| Aspect | Original SDK | Our Implementation |
|--------|--------------|-------------------|
| Language | C/C++ (Windows) | Python (cross-platform) |
| Key Generation | Random per packet | Random (can use static) |
| Thread Model | Background I/O thread | Asyncio |
| Cell Indexing | 1-8 (remapped) | 0-7 (direct) |
| Effects | Predefined + custom | Custom only |

## Our Implementation Status

✅ **Already implemented!** Our codebase uses Kyle Machulis' Python implementation:

```
modern-third-space/src/modern_third_space/legacy_port/thirdspace.py
```

This file contains:
- ✅ TEA encryption (`tea_encipher`, `tea_decipher`)
- ✅ Checksum calculation (`form_checksum`)
- ✅ Cache key table (280 bytes)
- ✅ CRC8 table (16 values)
- ✅ Packet formation (`form_packet`, `encrypt_packet`)
- ✅ USB communication (`write`, `read`)
- ✅ Device discovery and connection (`open`, `close`)

The implementation is wrapped by our modern `VestController` class in:
```
modern-third-space/src/modern_third_space/vest/controller.py
```

## What This Enables

1. **Cross-Platform Support**: No dependency on Windows SDK
2. **Simplified Protocol**: Static key eliminates complexity
3. **Full Control**: Direct cell addressing
4. **Integration Freedom**: Any language, any platform

## Files in This Directory

| File | Description |
|------|-------------|
| `tn-games-sdk.md` | SDK API documentation |
| `tngames_sdk.pdf` | Original PDF documentation |
| `tngaminglib-win32-x64.zip` | Windows SDK library |
| `third_space_vest_reverse_engineering.asciidoc` | Kyle Machulis' full RE document |
| `Scripts...zip` | Game integration scripts |

## Credits

- **Kyle Machulis (qDot)** - Original reverse engineering work
- **TN Games** - Original hardware manufacturer

---

**Document Status:** Complete reference  
**Last Updated:** November 2025  
**Based On:** Kyle Machulis RE document + TN Games SDK v1.5

