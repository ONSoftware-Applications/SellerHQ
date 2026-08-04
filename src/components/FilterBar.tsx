import { useState, type ReactNode } from 'react'

type FilterBarProps = {
  searchValue?: string
  searchPlaceholder?: string
  onSearchChange?: (value: string) => void
  filtersActive?: boolean
  onClearFilters?: () => void
  children?: ReactNode
  actions?: ReactNode
}

export function FilterBar({
  searchValue,
  searchPlaceholder = 'Search…',
  onSearchChange,
  filtersActive = false,
  onClearFilters,
  children,
  actions,
}: FilterBarProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="filter-bar">
      <div className="filter-bar-top">
        {onSearchChange && (
          <input
            type="search"
            className="filter-bar-search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        )}

        {children && (
          <button
            type="button"
            className={`filter-bar-toggle ${open ? 'active' : ''} ${filtersActive ? 'has-filters' : ''}`}
            onClick={() => setOpen(!open)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filters
            {filtersActive && <span className="filter-bar-badge" />}
          </button>
        )}

        {actions}
      </div>

      {open && children && (
        <div className="filter-bar-panel">
          {children}
          {onClearFilters && (
            <button
              type="button"
              className="secondary-button filter-bar-clear"
              onClick={onClearFilters}
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}