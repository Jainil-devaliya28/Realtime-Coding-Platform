"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { roomApi } from "@/lib/api"
import Link from "next/link"
import { formatRelativeTime, LANGUAGE_ICONS, LANGUAGE_LABELS } from "@/lib/utils"
import { Search, Plus, Lock, Globe, Users, Code2 } from "lucide-react"

export default function RoomsPage() {
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<"public" | "mine">("public")

  const { data, isLoading } = useQuery({
    queryKey: ["rooms", tab, search],
    queryFn: () =>
      tab === "mine"
        ? roomApi.getMyRooms().then((r) => r.data)
        : roomApi.list({ search, limit: "20" }).then((r) => r.data),
    staleTime: 30000,
  })

  const rooms = data?.rooms ?? []

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Rooms</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Collaborative coding environments
          </p>
        </div>
        <Link
          href="/dashboard/rooms/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all"
        >
          <Plus size={16} />
          New Room
        </Link>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex rounded-lg border p-1" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          {(["public", "mine"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
              style={{
                background: tab === t ? "var(--bg-elevated)" : "transparent",
                color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
              }}
            >
              {t === "public" ? "Public Rooms" : "My Rooms"}
            </button>
          ))}
        </div>

        <div className="flex-1 relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search rooms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl border animate-pulse" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }} />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-20">
          <Code2 size={48} className="mx-auto mb-4 text-blue-400 opacity-50" />
          <p className="text-lg font-medium text-white mb-2">No rooms found</p>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            {tab === "mine" ? "Create your first room to get started" : "No public rooms yet"}
          </p>
          <Link href="/dashboard/rooms/new" className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">
            Create Room
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room: any) => (
            <Link
              key={room.id}
              href={`/room/${room.id}`}
              className="group p-5 rounded-xl border transition-all hover:border-blue-500/40 hover:-translate-y-0.5"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{LANGUAGE_ICONS[room.language] || "💻"}</span>
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  {room.isPublic ? <Globe size={11} /> : <Lock size={11} />}
                  {room.isPublic ? "Public" : "Private"}
                </span>
              </div>
              <h3 className="font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors truncate">
                {room.name}
              </h3>
              {room.description && (
                <p className="text-xs mb-3 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                  {room.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="px-2 py-0.5 rounded-md" style={{ background: "var(--bg-elevated)" }}>
                  {LANGUAGE_LABELS[room.language]}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  {room._count?.memberships ?? 0}
                </span>
              </div>
              <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                by {room.owner?.username} · {formatRelativeTime(room.updatedAt)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
