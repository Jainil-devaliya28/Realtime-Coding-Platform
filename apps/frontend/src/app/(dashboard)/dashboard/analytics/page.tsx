"use client"

import { useQuery } from "@tanstack/react-query"
import { analyticsApi } from "@/lib/api"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, Zap, CheckCircle, XCircle } from "lucide-react"
import { format } from "date-fns"
import { LANGUAGE_ICONS } from "@/lib/utils"

const COLORS = ["#38bdf8", "#818cf8", "#4ade80", "#f87171", "#fbbf24"]

export default function AnalyticsPage() {
  const { data: dash } = useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: () => analyticsApi.getDashboard().then((r) => r.data.stats),
  })

  const { data: trends } = useQuery({
    queryKey: ["analytics", "trends"],
    queryFn: () => analyticsApi.getTrends(7).then((r) => r.data.trends),
  })

  const { data: userStats } = useQuery({
    queryKey: ["analytics", "me"],
    queryFn: () => analyticsApi.getUserAnalytics().then((r) => r.data.analytics),
  })

  const languagePieData = dash?.languageDistribution
    ? Object.entries(dash.languageDistribution).map(([lang, count]) => ({
        name: lang, value: count as number,
      }))
    : []

  const trendData = trends?.map((t: any) => ({
    date: format(new Date(t.date), "MMM d"),
    total: t.total,
    success: t.success,
    failure: t.failure,
  })) ?? []

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Execution metrics and platform insights
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Executions", value: dash?.totalExecutions ?? 0, icon: Zap, color: "text-yellow-400" },
          { label: "Today", value: dash?.todayExecutions ?? 0, icon: TrendingUp, color: "text-blue-400" },
          { label: "Success", value: `${dash?.successRate?.toFixed(1) ?? 0}%`, icon: CheckCircle, color: "text-green-400" },
          { label: "Avg Time", value: `${((dash?.avgExecutionTime ?? 0) / 1000).toFixed(2)}s`, icon: XCircle, color: "text-purple-400" },
        ].map((card) => (
          <div key={card.label} className="p-5 rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={14} className={card.color} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{card.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Execution trend */}
        <div className="rounded-xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <h2 className="font-semibold text-white mb-4">Executions (7 days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "var(--text-secondary)" }}
              />
              <Bar dataKey="success" fill="#4ade80" radius={[4, 4, 0, 0]} name="Success" />
              <Bar dataKey="failure" fill="#f87171" radius={[4, 4, 0, 0]} name="Failure" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Language distribution */}
        <div className="rounded-xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <h2 className="font-semibold text-white mb-4">Language Distribution</h2>
          {languagePieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={languagePieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {languagePieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {languagePieData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span style={{ color: "var(--text-secondary)" }}>
                      {LANGUAGE_ICONS[item.name] || ""} {item.name}
                    </span>
                    <span className="ml-auto font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: "var(--text-muted)" }}>
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Your stats */}
      {userStats && (
        <div className="rounded-xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <h2 className="font-semibold text-white mb-4">Your Personal Stats</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-white">{userStats.totalExecutions}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Total Runs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{userStats.successRate}%</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Success Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">{userStats.recentRooms?.length ?? 0}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Active Rooms</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {Object.keys(userStats.languageBreakdown ?? {}).length}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Languages Used</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
