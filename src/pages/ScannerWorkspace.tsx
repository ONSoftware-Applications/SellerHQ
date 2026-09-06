import Icon from '../components/Icon'
import { useSubscription } from '../hooks/useSubscription'
import Relay from './Relay'
import Scan from './Scan'

function isMobileDevice() {
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent)
}

function ScannerWorkspace() {
  const { canUse } = useSubscription()

  if (isMobileDevice()) {
    return <Scan />
  }

  if (canUse('qrRelay')) {
    return <Relay />
  }

  return (
    <div className="scanner-desktop-v2 panel-v2">
      <span className="scanner-desktop-icon-v2"><Icon name="scan" size={22} /></span>
      <h1>Use your phone to scan products</h1>
      <p>
        The SellerHQ QR scanner uses a mobile camera. Open the same SellerHQ business on your phone and choose Scan from the top bar.
      </p>
      <div className="scanner-desktop-note-v2">
        Live phone-to-desktop Scan Relay is available on the Business plan.
      </div>
    </div>
  )
}

export default ScannerWorkspace
