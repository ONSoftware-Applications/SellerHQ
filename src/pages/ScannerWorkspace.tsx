import Relay from './Relay'
import Scan from './Scan'

function isMobileDevice() {
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent)
}

function ScannerWorkspace() {
  return isMobileDevice() ? <Scan /> : <Relay />
}

export default ScannerWorkspace
