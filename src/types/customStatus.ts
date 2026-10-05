export type CustomStatusColour =
  | 'slate'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal'

export type CustomProductStatus = {
  id: string
  businessId: string
  name: string
  colour: CustomStatusColour
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type CustomProductStatusRow = {
  id: string
  business_id: string
  name: string
  colour: string
  sort_order: number | null
  created_at: string | null
  updated_at: string | null
}
