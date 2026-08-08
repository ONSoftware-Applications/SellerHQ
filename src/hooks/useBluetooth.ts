import { useCallback, useState } from 'react'

const SERVICE_UUID = '0000ffe0'
const CHARACTERISTIC_UUID = '0000ffe1'

interface BluetoothRemoteGATTCharacteristic {
  writeValue(data: BufferSource): Promise<void>
  readValue(): Promise<DataView>
  startNotifications(): Promise<void>
  stopNotifications(): Promise<void>
  addEventListener(
    type: 'characteristicvaluechanged',
    listener: (event: Event) => void,
  ): void
}

interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>
  getCharacteristics(uuid?: string): Promise<BluetoothRemoteGATTCharacteristic[]>
  getUUID(): string
  isPrimary: boolean
  uuid: string
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>
  getPrimaryServices(uuid?: string): Promise<BluetoothRemoteGATTService[]>
  getUUIDs(): string[]
  uuid: string
  device: BluetoothDevice
  connected: boolean
}

interface BluetoothDevice extends EventTarget {
  id: string
  name?: string
  adData?: unknown
  gatt: BluetoothRemoteGATTServer
  addEventListener(
    type: 'gattserverdisconnected',
    listener: (event: Event) => void,
  ): void
}

type BluetoothRequestOptions = {
  filters?: Array<{
    services?: string[]
    name?: string
    namePrefix?: string
    serviceDataUUIDs?: string[]
    manufacturerDataCodes?: number[]
    serviceDataComplete?: boolean
  }>
  optionalServices?: string[] | string
  acceptAllDevices?: boolean
}

interface Bluetooth {
  requestDevice(options: BluetoothRequestOptions): Promise<BluetoothDevice>
}

interface NavigatorBluetooth {
  readonly: boolean
  getAvailability(): Promise<boolean>
}

declare global {
  interface Navigator {
    bluetooth?: Bluetooth & NavigatorBluetooth
  }
}

interface BluetoothDeviceEx extends BluetoothDevice {
  gatt: BluetoothRemoteGATTServer
}

export function useBluetooth() {
  const [device, setDevice] = useState<BluetoothDeviceEx | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')

  const isSupported = useCallback(
    () => !!navigator.bluetooth,
    [],
  )

  const connect = useCallback(async () => {
    if (!isSupported()) {
      setError('Bluetooth is not supported on this browser. Use Chrome or Edge.')
      return null
    }

    try {
      const dev = await navigator.bluetooth!.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
      }) as BluetoothDeviceEx

      dev.addEventListener('gattserverdisconnected', () => {
        setConnected(false)
        setDevice(null)
      })

      const server = await dev.gatt.connect()
      setConnected(true)
      setDevice(dev)
      setError('')
      return { device: dev, server }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bluetooth connection failed'
      setError(msg)
      return null
    }
  }, [isSupported])

  const send = useCallback(async (data: string): Promise<boolean> => {
    if (!device || !connected) return false

    try {
      const server = device.gatt
      const service = await server.getPrimaryService(SERVICE_UUID)
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID)
      await characteristic.writeValue(new TextEncoder().encode(data))
      return true
    } catch (err) {
      console.error('Bluetooth send failed:', err)
      return false
    }
  }, [device, connected])

  const disconnect = useCallback(async () => {
    if (device) {
      device.gatt.disconnect()
      setConnected(false)
      setDevice(null)
    }
  }, [device])

  return { connect, send, disconnect, connected, error, isSupported }
}
