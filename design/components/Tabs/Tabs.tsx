import * as React from "react"
import styles from "./Tabs.module.css"

export interface TabItem {
  key: string
  label: string
}

export interface TabsProps {
  items: TabItem[]
  activeKey: string
  onChange: (key: string) => void
  className?: string
}

export function Tabs({ items, activeKey, onChange, className }: TabsProps) {
  return (
    <div
      className={[styles.tabs, className].filter(Boolean).join(" ")}
      role="tablist"
    >
      {items.map((item) => (
        <button
          key={item.key}
          role="tab"
          aria-selected={activeKey === item.key}
          className={[styles.tab, activeKey === item.key ? styles.active : ""].filter(Boolean).join(" ")}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
