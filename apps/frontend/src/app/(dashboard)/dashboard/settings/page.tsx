"use client"

import { useState } from "react"
import { useAuthStore } from "@/stores/auth.store"
import { useRouter } from "next/navigation"
import { User, Lock, LogOut, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    toast.success("Logged out successfully")
    router.push("/")
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Manage your account preferences
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-xl border p-6 mb-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 mb-5">
          <User size={16} className="text-blue-400" />
          <h2 className="font-semibold text-white">Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Username</label>
            <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
              {user?.username}
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Email</label>
            <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
              {user?.email}
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Role</label>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(56,189,248,0.1)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.2)" }}>
              {user?.role}
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border p-6" style={{ background: "var(--bg-card)", borderColor: "rgba(248,113,113,0.2)" }}>
        <div className="flex items-center gap-3 mb-5">
          <Lock size={16} className="text-red-400" />
          <h2 className="font-semibold text-white">Account Actions</h2>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          {isLoggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
          {isLoggingOut ? "Logging out..." : "Log out of all sessions"}
        </button>
      </div>
    </div>
  )
}
