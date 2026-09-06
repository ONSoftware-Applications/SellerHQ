import type { ReactNode } from 'react'
import Icon, { type IconName } from './Icon'

type WorkspaceTab = {
  id: string
  label: string
  icon?: IconName
  badge?: number | string
}

type WorkspaceShellProps = {
  title: string
  description: string
  eyebrow?: string
  tabs: WorkspaceTab[]
  activeTab: string
  onTabChange: (tab: string) => void
  actions?: ReactNode
  children: ReactNode
}

function WorkspaceShell({
  title,
  description,
  eyebrow,
  tabs,
  activeTab,
  onTabChange,
  actions,
  children,
}: WorkspaceShellProps) {
  return (
    <div className="workspace-v2">
      <header className="workspace-v2-header">
        <div className="workspace-v2-heading">
          {eyebrow && <span className="workspace-v2-eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions && <div className="workspace-v2-actions">{actions}</div>}
      </header>

      <nav className="workspace-v2-tabs" aria-label={`${title} sections`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.icon && <Icon name={tab.icon} size={14} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="workspace-v2-tab-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="workspace-v2-content">{children}</div>
    </div>
  )
}

export default WorkspaceShell
export type { WorkspaceTab }
