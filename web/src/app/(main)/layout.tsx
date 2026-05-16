export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-bg-secondary">
      {/* Sidebar — wired in plan-01 auth */}
      <aside className="w-64 bg-surface border-r border-border flex-shrink-0" />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar — wired in plan-01 auth */}
        <header className="h-16 bg-surface border-b border-border flex-shrink-0" />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
