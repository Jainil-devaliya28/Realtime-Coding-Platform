"use client"

import { useQuery } from "@tanstack/react-query"
import { executionApi } from "@/lib/api"
import { formatRelativeTime, formatTime, getStatusBadgeColor, LANGUAGE_ICONS } from "@/lib/utils"
import { Clock, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"

interface ExecutionHistoryProps {
  roomId: string
}

export function ExecutionHistory({ roomId }: ExecutionHistoryProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["execution-history", roomId],
    queryFn: () => executionApi.getHistory(roomId).then((r) => r.data),
    refetchInterval: 5000,
  })

  const history = data?.history ?? []

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-secondary)" }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <Clock size={14} className="text-blue-400" />
        <span className="text-sm font-medium text-white">Execution History</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
          {history.length}
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <Clock size={24} className="mb-2 opacity-30 text-blue-400" />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No executions yet</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {history.map((item: any) => (
              <div key={item.id}>
                <button
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                >
                  <span className="text-base">{LANGUAGE_ICONS[item.language] || "💻"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${getStatusBadgeColor(item.status)}`}>
                        {item.status}
                      </span>
                      {item.executionTime && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {formatTime(item.executionTime)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {formatRelativeTime(item.createdAt)}
                    </div>
                  </div>
                  {expanded === item.id ? (
                    <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
                  )}
                </button>

                {expanded === item.id && (
                  <div className="px-4 pb-3 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
                    {item.stdout && (
                      <div className="mt-2">
                        <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>STDOUT</div>
                        <pre className="text-xs p-2 rounded overflow-auto max-h-24 terminal-output text-green-300" style={{ background: "#0a0e1a" }}>
                          {item.stdout}
                        </pre>
                      </div>
                    )}
                    {item.stderr && (
                      <div className="mt-2">
                        <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>STDERR</div>
                        <pre className="text-xs p-2 rounded overflow-auto max-h-24 terminal-output text-red-400" style={{ background: "#0a0e1a" }}>
                          {item.stderr}
                        </pre>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span>Exit: {item.exitCode ?? "—"}</span>
                      {item.memoryUsed && <span>Mem: {item.memoryUsed}MB</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
