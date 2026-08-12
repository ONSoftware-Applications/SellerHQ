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

function compositeLogo(qrDataUrl: string, logoUrl: string, size: number): Promise<string> {
  return new Promise((resolve) => {
    const qr = new Image()
    qr.onload = () => {
      const logo = new Image()
      logo.crossOrigin = 'anonymous'
      logo.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(qrDataUrl)
          return
        }
        ctx.drawImage(qr, 0, 0, size, size)

        const logoSize = Math.round(size * 0.22)
        const x = (size - logoSize) / 2
        const y = (size - logoSize) / 2
        const pad = Math.round(logoSize * 0.12)

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2)
        ctx.drawImage(logo, x, y, logoSize, logoSize)

        try {
          resolve(canvas.toDataURL('image/png'))
        } catch {
          resolve(qrDataUrl)
        }
      }
      logo.onerror = () => resolve(qrDataUrl)
      logo.src = logoUrl
    }
    qr.onerror = () => resolve(qrDataUrl)
    qr.src = qrDataUrl
  })
}

export async function generateQrDataUrl(
  value: string,
  size = 280,
  logoUrl?: string | null,
): Promise<string> {
  const hasLogo = Boolean(logoUrl)
  const qrDataUrl = await QRCode.toDataURL(value, {
    errorCorrectionLevel: hasLogo ? 'H' : 'M',
    margin: 1,
    width: size,
    color: {
      dark: '#17191c',
      light: '#ffffff',
    },
  })

  if (!hasLogo) return qrDataUrl
  return compositeLogo(qrDataUrl, logoUrl!, size)
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
