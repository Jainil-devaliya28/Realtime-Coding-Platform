"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/auth.store"
import { Code2, Eye, EyeOff, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success("Welcome back!")
      router.push("/dashboard")
    } catch (error: any) {
      const msg =
        error?.response?.data?.error?.message ||
        (error?.code === "ERR_NETWORK" || error?.message === "Network Error"
          ? "Unable to reach the backend server. Please ensure the backend is running."
          : error?.message) ||
        "Invalid credentials"
      toast.error(msg)
    }
  }

  return (
    <div className="animate-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500 mb-4">
          <Code2 size={24} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Sign in to your CodePlatform account</p>
      </div>

      <div className="p-8 rounded-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all border focus:border-blue-500"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-10 rounded-lg text-sm outline-none transition-all border focus:border-blue-500"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium">Sign up</Link>
        </div>

        <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
          <strong>Demo:</strong> admin@codeplatform.dev / admin123456
        </div>
      </div>
    </div>
  )
}
