import QRCode from 'qrcode'

function canUseProductUrl() {
  if (typeof window === 'undefined') {
    return false
  }

  const { hostname, protocol } = window.location

  if (protocol !== 'http:' && protocol !== 'https:') {
    return false
  }

  return (
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1' &&
    hostname !== '0.0.0.0'
  )
}

export async function generateQrDataUrl(
  value: string,
  size = 280,
) {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: size,
    color: {
      dark: '#17191c',
      light: '#ffffff',
    },
  })
}

export function getProductQrValue({
  productId,
  fallbackValue,
}: {
  productId: string
  fallbackValue: string
}) {
  if (!canUseProductUrl()) {
    return fallbackValue
  }

  return `${window.location.origin}/products/${productId}`
}
