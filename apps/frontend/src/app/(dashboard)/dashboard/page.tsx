"use client"

import { useQuery } from "@tanstack/react-query"
import { analyticsApi, roomApi } from "@/lib/api"
import { useAuthStore } from "@/stores/auth.store"
import Link from "next/link"
import { formatRelativeTime, LANGUAGE_ICONS } from "@/lib/utils"
import { Users, Code2, Zap, TrendingUp, ArrowRight, Plus } from "lucide-react"

function StatCard({
  title, value, icon: Icon, colorClass, sub,
}: {
  title: string; value: string | number; icon: React.ElementType; colorClass: string; sub?: string
}) {
  return (
    <div className="p-6 rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: () => analyticsApi.getDashboard().then((r) => r.data.stats),
  })

  const { data: roomsData } = useQuery({
    queryKey: ["rooms", "public"],
    queryFn: () => roomApi.list({ limit: "6" }).then((r) => r.data),
  })

  const { data: userStats } = useQuery({
    queryKey: ["analytics", "me"],
    queryFn: () => analyticsApi.getUserAnalytics().then((r) => r.data.analytics),
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user?.username} 👋
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Here is what is happening on your platform today
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Executions" value={stats?.totalExecutions ?? 0} icon={Zap} colorClass="text-yellow-400 bg-yellow-500/10" sub="All time" />
        <StatCard title="Active Rooms" value={stats?.totalRooms ?? 0} icon={Code2} colorClass="text-blue-400 bg-blue-500/10" sub="Currently active" />
        <StatCard title="Users" value={stats?.totalUsers ?? 0} icon={Users} colorClass="text-purple-400 bg-purple-500/10" sub="Registered" />
        <StatCard title="Success Rate" value={stats?.successRate ? `${stats.successRate.toFixed(1)}%` : "0%"} icon={TrendingUp} colorClass="text-green-400 bg-green-500/10" sub="Execution success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-semibold text-white">Public Rooms</h2>
            <Link href="/dashboard/rooms" className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {roomsData?.rooms?.slice(0, 5).map((room: any) => (
              <Link key={room.id} href={`/room/${room.id}`} className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors">
                <span className="text-xl">{LANGUAGE_ICONS[room.language] || "💻"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{room.name}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    by {room.owner?.username} · {formatRelativeTime(room.updatedAt)}
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
              </Link>
            ))}
            {!roomsData?.rooms?.length && (
              <div className="p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>No rooms yet</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <h2 className="font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link href="/dashboard/rooms/new" className="flex items-center gap-3 p-3 rounded-lg border transition-all hover:border-blue-500/50" style={{ borderColor: "var(--border)" }}>
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Plus size={16} className="text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Create New Room</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>Start a collaborative session</div>
                </div>
              </Link>
              <Link href="/dashboard/rooms" className="flex items-center gap-3 p-3 rounded-lg border transition-all hover:border-blue-500/50" style={{ borderColor: "var(--border)" }}>
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Code2 size={16} className="text-purple-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Browse Rooms</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>Join a public coding room</div>
                </div>
              </Link>
            </div>
          </div>

          <div className="rounded-xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <h2 className="font-semibold text-white mb-4">Your Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Total Executions</span>
                <span className="font-medium text-white">{userStats?.totalExecutions ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Success Rate</span>
                <span className="font-medium text-green-400">{userStats?.successRate ?? 0}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Recent Rooms</span>
                <span className="font-medium text-white">{userStats?.recentRooms?.length ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
