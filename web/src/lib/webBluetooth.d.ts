// Minimal Web Bluetooth typings (not shipped in lib.dom.d.ts). Covers only the
// surface paperang.ts uses — not a full spec typing.

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  writeValue(value: Uint8Array | ArrayBuffer): Promise<void>
}

interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>
}

interface BluetoothDevice extends EventTarget {
  readonly name?: string
  readonly gatt?: BluetoothRemoteGATTServer
}

interface RequestDeviceOptions {
  acceptAllDevices?: boolean
  filters?: Array<Record<string, unknown>>
  optionalServices?: string[]
}

interface Bluetooth {
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>
}

interface Navigator {
  readonly bluetooth?: Bluetooth
}
