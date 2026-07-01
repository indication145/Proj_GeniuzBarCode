// Web Bluetooth link to PAPERANG P1/P2/P2S thermal printers. There's no vendor
// SDK for the browser — this ports the reverse-engineered BLE protocol from
// https://github.com/Yrr0r/paperang-web (script.js), cross-checked against
// https://github.com/broncotc/python-paperang for the CRC32 seed.
//
// Frame: [0x02, cmd, packetId, lenLo, lenHi, ...payload, crc0..3, 0x03]
// length is payload.length as uint16 LE; CRC32 (poly 0xEDB88320) is computed
// over the payload only, chained from seed 0x35769521 (same convention as
// zlib.crc32(payload, seed)).

const SERVICE_UUID = '49535343-fe7d-4ae5-8fa9-9fafd205e455'
const WRITE_CHAR_UUID = '49535343-6daa-4d02-abf6-19569aca69fe'

const CRC_SEED = 0x35769521
const CMD_PRINT = 0
const CMD_FEED = 26
const FEED_DOTS = 210 // advances paper past the tear bar after a print job

/** Print head is a fixed 384 dots (48 bytes) wide on this printer family. */
export const PRINT_WIDTH_DOTS = 384
export const PRINT_WIDTH_BYTES = 48
export const DOTS_PER_MM = 8

const MAX_CHUNK_BYTES = Math.floor(500 / PRINT_WIDTH_BYTES) * PRINT_WIDTH_BYTES // 480

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32Buf(buf: Uint8Array, seed: number): number {
  let c = seed ^ -1
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff]
  return (c ^ -1) >>> 0
}

function genPacket(cmd: number, data: number[] | Uint8Array, packetId = 0): Uint8Array {
  const payload = data instanceof Uint8Array ? data : Uint8Array.from(data)
  const len = payload.length
  const crc = crc32Buf(payload, CRC_SEED)
  const bytes = [
    0x02,
    cmd & 0xff,
    packetId & 0xff,
    len & 0xff,
    (len >>> 8) & 0xff,
    ...payload,
    crc & 0xff,
    (crc >>> 8) & 0xff,
    (crc >>> 16) & 0xff,
    (crc >>> 24) & 0xff,
    0x03,
  ]
  return Uint8Array.from(bytes)
}

let device: BluetoothDevice | null = null
let writeChar: BluetoothRemoteGATTCharacteristic | null = null
let disconnectListener: (() => void) | null = null

/** Called when the printer drops the BLE link on its own (out of range, powered off, ...). */
export function onDisconnect(cb: () => void): void {
  disconnectListener = cb
}

function handleDisconnect(): void {
  writeChar = null
  disconnectListener?.()
}

export function isSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth
}

export function isConnected(): boolean {
  return !!writeChar && !!device?.gatt?.connected
}

export function getDeviceName(): string {
  return device?.name || ''
}

export async function connect(): Promise<{ ok: boolean; name?: string; error?: string }> {
  if (!isSupported()) return { ok: false, error: 'เบราว์เซอร์นี้ไม่รองรับ Web Bluetooth — ใช้ Chrome หรือ Edge' }
  try {
    const dev = await navigator.bluetooth!.requestDevice({ acceptAllDevices: true, optionalServices: [SERVICE_UUID] })
    const server = await dev.gatt!.connect()
    const service = await server.getPrimaryService(SERVICE_UUID)
    const char = await service.getCharacteristic(WRITE_CHAR_UUID)
    dev.addEventListener('gattserverdisconnected', handleDisconnect)
    device = dev
    writeChar = char
    return { ok: true, name: dev.name }
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || String(e) }
  }
}

export function disconnect(): void {
  device?.gatt?.disconnect()
  writeChar = null
}

/** Send a packed 1-bit bitmap (PRINT_WIDTH_BYTES per row) to the printer, then feed the paper out. */
export async function printBits(bits: Uint8Array): Promise<void> {
  const char = writeChar
  if (!char) throw new Error('PAPERANG ยังไม่ได้เชื่อมต่อ')
  if (bits.length < 500) {
    await char.writeValue(genPacket(CMD_PRINT, bits))
  } else {
    for (let i = 0; i < bits.length; i += MAX_CHUNK_BYTES) {
      await char.writeValue(genPacket(CMD_PRINT, bits.subarray(i, i + MAX_CHUNK_BYTES)))
    }
  }
  await char.writeValue(genPacket(CMD_FEED, [FEED_DOTS]))
}
