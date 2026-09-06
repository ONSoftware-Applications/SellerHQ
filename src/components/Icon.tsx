import type { SVGProps } from 'react'

export type IconName =
  | 'dashboard'
  | 'inventory'
  | 'listings'
  | 'sales'
  | 'till'
  | 'expenses'
  | 'tax'
  | 'reports'
  | 'forecast'
  | 'receipts'
  | 'team'
  | 'relay'
  | 'settings'
  | 'support'
  | 'profile'
  | 'logout'
  | 'menu'
  | 'plus'
  | 'chevron-down'
  | 'building'
  | 'scan'
  | 'download'
  | 'package'
  | 'truck'
  | 'clock'
  | 'trend-up'
  | 'trend-down'
  | 'wallet'
  | 'sparkles'
  | 'alert'
  | 'arrow-right'
  | 'check'
  | 'search'
  | 'close'
  | 'more'

export type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
  size?: number
}

function Icon({ name, size = 18, ...props }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    ...props,
  }

  const paths: Record<IconName, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    inventory: <><path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z" /><path d="M4 7.5V17l8 4 8-4V7.5" /><path d="M12 12v9" /></>,
    listings: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h7.2l6.8 6.8a1.5 1.5 0 0 1 0 2.1l-6.6 6.6a1.5 1.5 0 0 1-2.1 0L4 12.7V5.5Z" /><circle cx="8" cy="8" r="1.25" /></>,
    sales: <><path d="M5 20V10" /><path d="M12 20V4" /><path d="M19 20v-7" /><path d="M3 20h18" /></>,
    till: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M7 10h10" /><path d="M7 14h4" /><path d="M15 14h2" /></>,
    expenses: <><path d="M4 5h16v14H4z" /><path d="M8 9h8" /><path d="M8 13h5" /><path d="M8 17h3" /></>,
    tax: <><circle cx="7" cy="7" r="2" /><circle cx="17" cy="17" r="2" /><path d="m6 18 12-12" /></>,
    reports: <><path d="M5 20V9" /><path d="M10 20V4" /><path d="M15 20v-7" /><path d="M20 20V8" /></>,
    forecast: <><path d="m3 17 6-6 4 4 8-9" /><path d="M16 6h5v5" /></>,
    receipts: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6" /><path d="M9 12h6" /><path d="M9 16h3" /></>,
    team: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.5-4 2.4-6 5.5-6s5 2 5.5 6" /><circle cx="17" cy="9" r="2.25" /><path d="M15.5 14.5c3.2-.3 5 1.5 5.5 4.5" /></>,
    relay: <><path d="M5 12a7 7 0 0 1 7-7" /><path d="M5 17a12 12 0 0 1 12-12" /><circle cx="5" cy="21" r="1" /><path d="M13 14h8v7h-8z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    support: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.5 2.5 0 1 1 4.2 1.8c-1.2 1-2 1.5-2 3.2" /><path d="M12 18h.01" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M14 3h6a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-6" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    'chevron-down': <path d="m6 9 6 6 6-6" />,
    building: <><path d="M4 21V5l8-3 8 3v16" /><path d="M8 9h2" /><path d="M14 9h2" /><path d="M8 13h2" /><path d="M14 13h2" /><path d="M9 21v-4h6v4" /></>,
    scan: <><path d="M4 8V4h4" /><path d="M16 4h4v4" /><path d="M20 16v4h-4" /><path d="M8 20H4v-4" /><path d="M7 12h10" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    package: <><path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z" /><path d="M4 7.5V17l8 4 8-4V7.5" /></>,
    truck: <><path d="M3 6h11v10H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    'trend-up': <><path d="m4 16 5-5 4 4 7-8" /><path d="M15 7h5v5" /></>,
    'trend-down': <><path d="m4 8 5 5 4-4 7 8" /><path d="M15 17h5v-5" /></>,
    wallet: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" /><path d="M15 9h6v6h-6a3 3 0 0 1 0-6Z" /></>,
    sparkles: <><path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2L12 3Z" /><path d="m18.5 13 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" /><path d="m6 14 .7 1.8 1.8.7-1.8.7L6 19l-.7-1.8-1.8-.7 1.8-.7L6 14Z" /></>,
    alert: <><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5" /><path d="M12 17h.01" /></>,
    'arrow-right': <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  }

  return <svg {...common}>{paths[name]}</svg>
}

export default Icon
