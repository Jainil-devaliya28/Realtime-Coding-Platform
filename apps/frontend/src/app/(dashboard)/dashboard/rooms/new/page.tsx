"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { roomApi } from "@/lib/api"
import { LANGUAGE_ICONS, LANGUAGE_LABELS } from "@/lib/utils"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

const languages = ["python", "javascript", "cpp", "java", "verilog"] as const

export default function NewRoomPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [language, setLanguage] = useState<typeof languages[number]>("python")
  const [isPublic, setIsPublic] = useState(true)

  const { mutate, isPending } = useMutation({
    mutationFn: () => roomApi.create({ name, description, language, isPublic }),
    onSuccess: (res) => {
      toast.success("Room created!")
      router.push(`/room/${res.data.room.id}`)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || "Failed to create room")
    },
  })

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link href="/dashboard/rooms" className="flex items-center gap-2 text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          <ArrowLeft size={14} /> Back to rooms
        </Link>
        <h1 className="text-2xl font-bold text-white">Create New Room</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Set up a collaborative coding environment
        </p>
      </div>

      <div className="rounded-xl border p-6 space-y-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Room Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Project"
            maxLength={100}
            className="w-full px-4 py-3 rounded-lg text-sm outline-none border focus:border-blue-500"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will you be coding here?"
            maxLength={500}
            rows={3}
            className="w-full px-4 py-3 rounded-lg text-sm outline-none border focus:border-blue-500 resize-none"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Language *</label>
          <div className="grid grid-cols-5 gap-2">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all"
                style={{
                  borderColor: language === lang ? "#38bdf8" : "var(--border)",
                  background: language === lang ? "rgba(56,189,248,0.1)" : "var(--bg-elevated)",
                }}
              >
                <span className="text-2xl">{LANGUAGE_ICONS[lang]}</span>
                <span className="text-xs font-medium" style={{ color: language === lang ? "#38bdf8" : "var(--text-secondary)" }}>
                  {LANGUAGE_LABELS[lang]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Visibility</label>
          <div className="flex gap-3">
            {[
              { value: true, label: "Public", desc: "Anyone can view and join" },
              { value: false, label: "Private", desc: "Only invited members" },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => setIsPublic(opt.value)}
                className="flex-1 p-4 rounded-xl border text-left transition-all"
                style={{
                  borderColor: isPublic === opt.value ? "#38bdf8" : "var(--border)",
                  background: isPublic === opt.value ? "rgba(56,189,248,0.1)" : "var(--bg-elevated)",
                }}
              >
                <div className="text-sm font-medium mb-1" style={{ color: isPublic === opt.value ? "#38bdf8" : "var(--text-primary)" }}>
                  {opt.label}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={() => mutate()}
          disabled={!name.trim() || isPending}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending && <Loader2 size={16} className="animate-spin" />}
          {isPending ? "Creating..." : "Create Room"}
        </button>
      </div>
    </div>
  )
}
