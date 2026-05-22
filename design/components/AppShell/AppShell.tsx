import * as React from "react"
import styles from "./AppShell.module.css"

export type UserRole = "admin" | "company" | "customer"

export interface NavItem {
  label: string
  href: string
  roles: UserRole[]
}

export interface AppShellUser {
  name: string
  role: UserRole
  initials: string
}

export interface AppShellProps {
  user: AppShellUser
  currentPath: string
  navItems: NavItem[]
  pageTitle?: string
  breadcrumb?: { label: string; href?: string }[]
  onLogout?: () => void
  children: React.ReactNode
}

const roleBadgeClass: Record<UserRole, string> = {
  admin:    styles.roleAdmin,
  company:  styles.roleCompany,
  customer: styles.roleCustomer,
}

const roleLabel: Record<UserRole, string> = {
  admin:    "Admin",
  company:  "Company",
  customer: "Customer",
}

export function AppShell({
  user,
  currentPath,
  navItems,
  breadcrumb,
  onLogout,
  children,
}: AppShellProps) {
  const visibleItems = navItems.filter((item) => item.roles.includes(user.role))

  return (
    <div className={styles.shell}>
      {/* Top bar */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <div className={styles.brandMark} aria-hidden="true">T</div>
          <span className={styles.brandName}>Tetra</span>
          {breadcrumb && breadcrumb.length > 0 && (
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <span className={styles.breadcrumbSep} aria-hidden="true">/</span>
              {breadcrumb.map((crumb, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className={styles.breadcrumbSep} aria-hidden="true">/</span>}
                  {crumb.href ? (
                    <a href={crumb.href} className={styles.breadcrumbLink}>{crumb.label}</a>
                  ) : (
                    <span className={styles.breadcrumbCurrent}>{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
        </div>
        <div className={styles.topbarRight}>
          <span className={[styles.roleBadge, roleBadgeClass[user.role]].join(" ")}>
            {roleLabel[user.role]}
          </span>
          <div className={styles.avatar} aria-hidden="true">{user.initials}</div>
          {onLogout && (
            <button className={styles.logoutBtn} onClick={onLogout}>
              Sign out
            </button>
          )}
        </div>
      </header>

      <div className={styles.body}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <nav className={styles.nav} aria-label="Main navigation">
            {visibleItems.map((item) => {
              const active = currentPath === item.href || currentPath.startsWith(item.href + "/")
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[styles.navItem, active ? styles.navItemActive : ""].filter(Boolean).join(" ")}
                >
                  {item.label}
                </a>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}
