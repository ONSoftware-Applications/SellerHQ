import logo from '../assets/sellerhq-logo.png'

type BrandMarkProps = {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  className?: string
}

function BrandMark({
  size = 'md',
  showWordmark = true,
  className = '',
}: BrandMarkProps) {
  return (
    <div
      className={`brand-mark ${size} ${className}`.trim()}
      aria-label="SellerHQ"
    >
      <div className="brand-mark-icon" aria-hidden="true">
        <img
          src={logo}
          alt="SellerHQ logo"
          className="brand-mark-logo"
        />
      </div>

      {showWordmark && (
        <span className="brand-mark-wordmark">SellerHQ</span>
      )}
    </div>
  )
}

export default BrandMark
