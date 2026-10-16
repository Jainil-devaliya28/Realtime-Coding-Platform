"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/auth.store"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Code2, BarChart2, Settings, LogOut, Plus } from "lucide-react"
import toast from "react-hot-toast"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/rooms", label: "My Rooms", icon: Code2 },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout, loadProfile } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    if (!token) { router.push("/login"); return }
    if (!isAuthenticated) loadProfile()
  }, [isAuthenticated, loadProfile, router])

  const handleLogout = async () => {
    await logout()
    toast.success("Logged out")
    router.push("/")
  }

  if (!mounted || (!isAuthenticated && typeof window !== "undefined" && !localStorage.getItem("accessToken"))) return null

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r flex flex-col" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        {/* Logo */}
        <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Code2 size={16} className="text-white" />
            </div>
            <span className="font-bold text-white">CodePlatform</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: isActive ? "rgba(56,189,248,0.1)" : "transparent",
                  color: isActive ? "#38bdf8" : "var(--text-secondary)",
                }}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* New Room button */}
        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          <Link
            href="/dashboard/rooms/new"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-all"
          >
            <Plus size={16} />
            New Room
          </Link>
        </div>

        {/* User */}
        <div className="p-4 border-t flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.username?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.username}</div>
            <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{user?.role}</div>
          </div>
          <button onClick={handleLogout} className="flex-shrink-0" style={{ color: "var(--text-muted)" }}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
