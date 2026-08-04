type LoadingStateProps = {
  label?: string
  minHeight?: number
}

function LoadingState({ label = 'Loading...', minHeight = 220 }: LoadingStateProps) {
  return (
    <div
      className="inventory-loading"
      style={{ minHeight: `${minHeight}px` }}
    >
      <div className="inventory-spinner" />
      <span>{label}</span>
    </div>
  )
}

export default LoadingState