"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Send, Loader2, Code2, Zap, FlaskConical, RotateCcw } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface AIPanelProps {
  roomId: string
  code: string
  language: string
  error?: string
  conversationId?: string
  onConversationId: (id: string) => void
}

const QUICK_ACTIONS = [
  { label: "Explain Code", icon: Code2, message: "Please explain this code step by step." },
  { label: "Fix Error", icon: Zap, message: "I have an error in my code. Please analyze and fix it." },
  { label: "Generate Tests", icon: FlaskConical, message: "Generate comprehensive test cases for this code including edge cases." },
  { label: "Optimize", icon: RotateCcw, message: "Analyze the time and space complexity and suggest optimizations." },
]

export function AIPanel({ roomId, code, language, error, conversationId, onConversationId }: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || isLoading) return

    setInput("")
    const userMsg: Message = { role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    const assistantMsg: Message = { role: "assistant", content: "" }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      const token = localStorage.getItem("accessToken")
      const res = await fetch(`${API_URL}/api/ai/rooms/${roomId}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          code: code || undefined,
          error: error || undefined,
          conversationId: conversationId || undefined,
        }),
      })

      if (!res.ok) throw new Error("AI request failed")

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error("No stream")

      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === "chunk") {
                fullContent += data.content
                setMessages((prev) => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: "assistant", content: fullContent }
                  return updated
                })
              } else if (data.type === "done" && data.conversationId) {
                onConversationId(data.conversationId)
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, I encountered an error. Please check your API key configuration.",
        }
        return updated
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-secondary)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <Bot size={14} className="text-purple-400" />
        </div>
        <div>
          <div className="text-sm font-medium text-white">AI Assistant</div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>Powered by GPT-4</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Bot size={32} className="mx-auto mb-2 text-purple-400 opacity-60" />
              <p className="text-sm font-medium text-white">AI Debugging Assistant</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                I can explain code, fix errors, generate tests, and optimize your solutions.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.message)}
                  className="flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all hover:border-purple-500/40"
                  style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
                >
                  <action.icon size={14} className="text-purple-400" />
                  <span className="text-xs font-medium text-white">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={12} className="text-purple-400" />
                </div>
              )}
              <div
                className="max-w-[85%] rounded-xl px-3 py-2 text-sm"
                style={{
                  background: msg.role === "user" ? "rgba(56,189,248,0.15)" : "var(--bg-elevated)",
                  border: `1px solid ${msg.role === "user" ? "rgba(56,189,248,0.2)" : "var(--border)"}`,
                  color: "var(--text-primary)",
                }}
              >
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-invert prose-sm max-w-none"
                    components={{
                      code: ({ node, className, children, ...props }) => {
                        const isBlock = className?.includes("language-")
                        return isBlock ? (
                          <pre className="rounded-lg p-3 overflow-x-auto text-xs mt-2 mb-2" style={{ background: "#0a0e1a" }}>
                            <code className={className} {...props}>{children}</code>
                          </pre>
                        ) : (
                          <code className="px-1 py-0.5 rounded text-xs" style={{ background: "#0a0e1a" }} {...props}>{children}</code>
                        )
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <p>{msg.content}</p>
                )}
                {isLoading && i === messages.length - 1 && msg.role === "assistant" && !msg.content && (
                  <Loader2 size={14} className="animate-spin text-purple-400" />
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ask about your code... (Enter to send)"
            rows={2}
            className="flex-1 px-3 py-2 rounded-lg text-xs outline-none resize-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-purple-500 hover:bg-purple-600 disabled:opacity-50 transition-all self-end"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin text-white" /> : <Send size={14} className="text-white" />}
          </button>
        </div>
      </div>
    </div>
  )
}
