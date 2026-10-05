import { useCustomStatuses } from '../hooks/useCustomStatuses'
import {
  getCustomStatus,
  getCustomStatusStyle,
  getProductStatusLabel,
} from '../lib/productStatus'
import type { Product } from '../types/product'

type ProductStatusBadgeProps = {
  product: Pick<Product, 'status' | 'customStatusId'>
  labelOverride?: string
}

export default function ProductStatusBadge({
  product,
  labelOverride,
}: ProductStatusBadgeProps) {
  const { statuses } = useCustomStatuses()
  const customStatus = getCustomStatus(product, statuses)
  const label = labelOverride ?? getProductStatusLabel(product, statuses)

  if (customStatus) {
    return (
      <span
        className="status-badge custom-status-badge"
        style={getCustomStatusStyle(customStatus.colour)}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className={`status-badge status-${product.status
        .toLowerCase()
        .replace(/ /g, '-')}`}
    >
      {label}
    </span>
  )
}
