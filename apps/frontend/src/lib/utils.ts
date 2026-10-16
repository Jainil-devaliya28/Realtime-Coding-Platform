import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(ms: number): string {
  if (ms < 1000) return ms + "ms"
  return (ms / 1000).toFixed(2) + "s"
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / 1048576).toFixed(1) + " MB"
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export const LANGUAGE_ICONS: Record<string, string> = {
  python: "🐍",
  javascript: "🟨",
  cpp: "⚙️",
  java: "☕",
  verilog: "🔌",
}

export const LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
  java: "Java",
  verilog: "Verilog",
}

export const LANGUAGE_MONACO_MAP: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  cpp: "cpp",
  java: "java",
  verilog: "verilog",
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "completed": return "text-green-400"
    case "failed": return "text-red-400"
    case "timeout": return "text-yellow-400"
    case "memory_limit": return "text-orange-400"
    case "running": return "text-blue-400"
    case "pending": return "text-gray-400"
    default: return "text-gray-400"
  }
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "completed": return "bg-green-500/20 text-green-400 border-green-500/30"
    case "failed": return "bg-red-500/20 text-red-400 border-red-500/30"
    case "timeout": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    case "memory_limit": return "bg-orange-500/20 text-orange-400 border-orange-500/30"
    case "running": return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    case "pending": return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    default: return "bg-gray-500/20 text-gray-400 border-gray-500/30"
  }
}
