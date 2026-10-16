"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import dynamic from "next/dynamic"
import { useAuthStore } from "@/stores/auth.store"
import { useEditorStore } from "@/stores/editor.store"
import { roomApi } from "@/lib/api"
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket"
import { LANGUAGE_MONACO_MAP, LANGUAGE_LABELS, LANGUAGE_ICONS, formatTime, getStatusBadgeColor } from "@/lib/utils"
import {
  Play, Square, Users, Wifi, WifiOff, ChevronDown, Terminal,
  Bot, History, Settings, Loader2, Copy, Check, Maximize2
} from "lucide-react"
import type { CollaborationUser } from "@code-platform/shared"
import toast from "react-hot-toast"
import { AIPanel } from "@/components/ai/AIPanel"
import { ExecutionHistory } from "@/components/editor/ExecutionHistory"

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: () => (
  <div className="flex-1 flex items-center justify-center" style={{ background: "#0f1629" }}>
    <Loader2 size={24} className="animate-spin text-blue-400" />
  </div>
) })

type Panel = "output" | "ai" | "history" | null

export default function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const {
    code, language, version, stdin,
    collaborators, execution, isConnected,
    setCode, setLanguage, setVersion, setCollaborators,
    addCollaborator, removeCollaborator, updateCollaboratorCursor,
    setIsConnected, setRoomId,
    startExecution, appendOutput, completeExecution, resetExecution,
    setStdin,
  } = useEditorStore()

  const [activePanel, setActivePanel] = useState<Panel>("output")
  const [isRunning, setIsRunning] = useState(false)
  const [showStdin, setShowStdin] = useState(false)
  const [copied, setCopied] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const editorRef = useRef<any>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const versionRef = useRef(0)

  const { data: room, isLoading } = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => roomApi.getById(roomId).then((r) => r.data.room),
    enabled: !!roomId,
  })

  // Initialize room
  useEffect(() => {
    if (!room) return
    setCode(room.code || "")
    setLanguage(room.language)
    setVersion(room.version || 0)
    versionRef.current = room.version || 0
    setRoomId(roomId)
  }, [room, roomId, setCode, setLanguage, setVersion, setRoomId])

  // Socket connection
  useEffect(() => {
    if (!roomId || !user) return

    const token = accessToken || localStorage.getItem("accessToken")
    if (!token) { router.push("/login"); return }

    connectSocket()
    const socket = getSocket()

    socket.emit("room:join", { roomId, token })

    socket.on("room:joined", ({ room: r, users }) => {
      setCode(r.code || "")
      setLanguage(r.language)
      setVersion(r.version || 0)
      versionRef.current = r.version || 0
      setCollaborators(users.filter((u: CollaborationUser) => u.userId !== user.id))
      setIsConnected(true)
      toast.success("Joined room!")
    })

    socket.on("room:user_joined", (u) => {
      if (u.userId !== user.id) {
        addCollaborator(u)
        toast(`${u.username} joined`, { icon: "👋" })
      }
    })

    socket.on("room:user_left", ({ userId }) => {
      removeCollaborator(userId)
    })

    socket.on("room:error", ({ message }) => {
      toast.error(message)
      router.push("/dashboard")
    })

    socket.on("code:change", (change) => {
      if (change.userId === user.id) return
      if (change.type === "replace" && change.text !== undefined) {
        setCode(change.text)
        setVersion(change.version)
        versionRef.current = change.version
      }
    })

    socket.on("code:cursor", ({ userId, cursor }) => {
      if (userId !== user.id) updateCollaboratorCursor(userId, cursor)
    })

    socket.on("execution:started", ({ jobId }) => {
      startExecution(jobId)
      setIsRunning(true)
      setActivePanel("output")
    })

    socket.on("execution:output", ({ chunk, stream }) => {
      appendOutput(chunk, stream)
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight
      }
    })

    socket.on("execution:completed", (result) => {
      completeExecution(result)
      setIsRunning(false)
      const statusMsg = result.status === "completed" ? "✅ Execution completed" :
                        result.status === "timeout" ? "⏱ Execution timed out" :
                        `❌ Execution ${result.status}`
      toast(statusMsg, { duration: 3000 })
    })

    socket.on("execution:error", ({ message }) => {
      setIsRunning(false)
      toast.error(`Execution error: ${message}`)
    })

    socket.on("ai:response", ({ conversationId: cid, chunk, done }) => {
      if (cid) setConversationId(cid)
    })

    socket.on("disconnect", () => setIsConnected(false))

    return () => {
      socket.emit("room:leave", { roomId })
      socket.off("room:joined")
      socket.off("room:user_joined")
      socket.off("room:user_left")
      socket.off("room:error")
      socket.off("code:change")
      socket.off("code:cursor")
      socket.off("execution:started")
      socket.off("execution:output")
      socket.off("execution:completed")
      socket.off("execution:error")
      socket.off("ai:response")
      socket.off("disconnect")
      setIsConnected(false)
      setCollaborators([])
    }
  }, [roomId, user, accessToken])

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || ""
    const newVersion = versionRef.current + 1
    versionRef.current = newVersion
    setCode(newCode)
    setVersion(newVersion)

    const socket = getSocket()
    socket.emit("code:change", {
      type: "replace",
      position: 0,
      text: newCode,
      version: newVersion,
    })
  }

  const handleCursorChange = (e: any) => {
    if (!e?.position) return
    const socket = getSocket()
    socket.emit("code:cursor", {
      lineNumber: e.position.lineNumber,
      column: e.position.column,
    })
  }

  const handleRun = () => {
    if (isRunning) return
    resetExecution()
    const socket = getSocket()
    socket.emit("execution:run", { code, language, stdin: stdin || undefined })
  }

  const copyOutput = () => {
    const text = execution.output + (execution.errorOutput ? "\n--- STDERR ---\n" + execution.errorOutput : "")
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg-primary)" }}>
        <Loader2 size={32} className="animate-spin text-blue-400" />
      </div>
    )
  }

  const outputContent = execution.output || execution.errorOutput

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">{LANGUAGE_ICONS[language] || "💻"}</span>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{room?.name || "Loading..."}</h1>
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              {isConnected ? (
                <><Wifi size={10} className="text-green-400" /><span className="text-green-400">Connected</span></>
              ) : (
                <><WifiOff size={10} className="text-red-400" /><span className="text-red-400">Disconnected</span></>
              )}
            </div>
          </div>
        </div>

        {/* Language selector */}
        <div className="relative">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs border outline-none cursor-pointer"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            {["python","javascript","cpp","java","verilog"].map((l) => (
              <option key={l} value={l}>{LANGUAGE_ICONS[l]} {LANGUAGE_LABELS[l]}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
        </div>

        {/* Collaborators */}
        {collaborators.length > 0 && (
          <div className="flex items-center gap-1">
            <Users size={12} style={{ color: "var(--text-muted)" }} />
            <div className="flex -space-x-1">
              {collaborators.slice(0, 4).map((c) => (
                <div
                  key={c.userId}
                  title={c.username}
                  className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                  style={{ background: c.color, borderColor: "var(--bg-secondary)" }}
                >
                  {c.username[0].toUpperCase()}
                </div>
              ))}
              {collaborators.length > 4 && (
                <div className="w-6 h-6 rounded-full border-2 bg-gray-700 flex items-center justify-center text-xs" style={{ borderColor: "var(--bg-secondary)" }}>
                  +{collaborators.length - 4}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={isRunning || !isConnected}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{ background: isRunning ? "rgba(74,222,128,0.1)" : "#22c55e", color: isRunning ? "#4ade80" : "white" }}
        >
          {isRunning ? <><Square size={14} /><span>Running...</span></> : <><Play size={14} /><span>Run</span></>}
        </button>
      </div>

      {/* Main editor area */}
      <div className="flex flex-1 min-h-0">
        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1">
            <MonacoEditor
              height="100%"
              language={LANGUAGE_MONACO_MAP[language] || language}
              value={code}
              onChange={handleCodeChange}
              onMount={(editor) => {
                editorRef.current = editor
                editor.onDidChangeCursorPosition(handleCursorChange)
              }}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                tabSize: 2,
                lineNumbers: "on",
                glyphMargin: true,
                folding: true,
                renderLineHighlight: "all",
                cursorBlinking: "smooth",
                smoothScrolling: true,
                padding: { top: 12 },
              }}
            />
          </div>

          {/* Bottom panel */}
          <div className="border-t flex-shrink-0" style={{ borderColor: "var(--border)" }}>
            {/* Panel tabs */}
            <div className="flex items-center gap-1 px-3 py-1 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
              {([
                { id: "output", icon: Terminal, label: "Output" },
                { id: "ai", icon: Bot, label: "AI Assistant" },
                { id: "history", icon: History, label: "History" },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(activePanel === tab.id ? null : tab.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: activePanel === tab.id ? "var(--bg-elevated)" : "transparent",
                    color: activePanel === tab.id ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  <tab.icon size={12} />
                  {tab.label}
                  {tab.id === "output" && execution.status && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded text-xs border ${getStatusBadgeColor(execution.status)}`}>
                      {execution.status}
                    </span>
                  )}
                </button>
              ))}

              {/* Stdin toggle */}
              <button
                onClick={() => setShowStdin(!showStdin)}
                className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs transition-all"
                style={{ color: showStdin ? "#38bdf8" : "var(--text-muted)" }}
              >
                <Settings size={11} />
                Stdin
              </button>

              {outputContent && (
                <button onClick={copyOutput} className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ color: "var(--text-muted)" }}>
                  {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                </button>
              )}
            </div>

            {/* Stdin input */}
            {showStdin && (
              <div className="p-2 border-b" style={{ borderColor: "var(--border)" }}>
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="Standard input (stdin)..."
                  rows={2}
                  className="w-full px-3 py-2 rounded text-xs outline-none resize-none font-mono"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            )}

            {/* Panel content */}
            {activePanel === "output" && (
              <div ref={outputRef} className="h-48 overflow-auto p-4 terminal-output" style={{ background: "#0a0e1a" }}>
                {isRunning && !outputContent && (
                  <div className="flex items-center gap-2 text-blue-400 text-xs">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Executing...</span>
                  </div>
                )}
                {execution.output && (
                  <pre className="text-green-300 whitespace-pre-wrap text-xs">{execution.output}</pre>
                )}
                {execution.errorOutput && (
                  <pre className="text-red-400 whitespace-pre-wrap text-xs">{execution.errorOutput}</pre>
                )}
                {!outputContent && !isRunning && (
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Press <kbd className="px-1.5 py-0.5 rounded" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>Run</kbd> to execute your code
                  </div>
                )}
                {execution.executionTime !== null && !isRunning && (
                  <div className="mt-2 pt-2 border-t text-xs flex items-center gap-3" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                    <span>Exit: {execution.exitCode}</span>
                    <span>Time: {formatTime(execution.executionTime)}</span>
                    {execution.memoryUsed && <span>Memory: {execution.memoryUsed}MB</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* AI Panel (right sidebar) */}
        {activePanel === "ai" && (
          <div className="w-96 border-l flex-shrink-0" style={{ borderColor: "var(--border)" }}>
            <AIPanel
              roomId={roomId}
              code={code}
              language={language}
              error={execution.errorOutput}
              conversationId={conversationId}
              onConversationId={setConversationId}
            />
          </div>
        )}

        {/* History panel */}
        {activePanel === "history" && (
          <div className="w-80 border-l flex-shrink-0" style={{ borderColor: "var(--border)" }}>
            <ExecutionHistory roomId={roomId} />
          </div>
        )}
      </div>
    </div>
  )
}
