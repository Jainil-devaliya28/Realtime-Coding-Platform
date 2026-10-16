import Link from "next/link"
import { ArrowRight, Zap, Users, Brain, Shield, Globe, Code2 } from "lucide-react"

const features = [
  {
    icon: Code2,
    title: "Multi-Language Support",
    description: "Python, JavaScript, C++, Java, and Verilog with syntax highlighting and IntelliSense",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Users,
    title: "Real-Time Collaboration",
    description: "Multiple users editing simultaneously with cursor sync and typing indicators",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: Zap,
    title: "Instant Execution",
    description: "Distributed worker system executes code in isolated containers with live output streaming",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    icon: Brain,
    title: "AI Debugging Assistant",
    description: "GPT-4 powered assistant that explains errors, suggests fixes, and generates test cases",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: Shield,
    title: "Secure Sandbox",
    description: "Docker containers with CPU, memory, and network restrictions keep execution safe",
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  {
    icon: Globe,
    title: "Execution Analytics",
    description: "Track performance metrics, success rates, and language distribution across your rooms",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Nav */}
      <nav className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Code2 size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-white">CodePlatform</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm" style={{ color: "var(--text-secondary)" }}>Sign in</Link>
            <Link
              href="/signup"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-8 border" style={{ background: "rgba(56,189,248,0.1)", borderColor: "rgba(56,189,248,0.2)", color: "#38bdf8" }}>
          <Zap size={12} />
          Real-time collaborative code execution
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="text-white">Code together,</span>
          <br />
          <span className="gradient-text">ship faster</span>
        </h1>

        <p className="text-xl max-w-2xl mx-auto mb-10" style={{ color: "var(--text-secondary)" }}>
          A collaborative cloud IDE with real-time editing, AI debugging, and instant code execution
          in secure Docker containers.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all hover:scale-105"
          >
            Start Coding Free <ArrowRight size={16} />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all border hover:border-blue-500/50"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Browse Rooms
          </Link>
        </div>
      </div>

      {/* Code preview */}
      <div className="max-w-5xl mx-auto px-6 mb-24">
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>main.py — CodePlatform</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>3 collaborators</span>
            </div>
          </div>
          <div className="p-6 font-mono text-sm" style={{ color: "var(--text-primary)" }}>
            <div><span style={{ color: "#569cd6" }}>def</span> <span style={{ color: "#dcdcaa" }}>fibonacci</span><span style={{ color: "#d4d4d4" }}>(n: </span><span style={{ color: "#4ec9b0" }}>int</span><span style={{ color: "#d4d4d4" }}>) -&gt; </span><span style={{ color: "#4ec9b0" }}>list</span><span style={{ color: "#d4d4d4" }}>:</span></div>
            <div className="pl-8"><span style={{ color: "#ce9178" }}>&quot;&quot;&quot;Generate first n Fibonacci numbers&quot;&quot;&quot;</span></div>
            <div className="pl-8"><span style={{ color: "#d4d4d4" }}>a, b </span><span style={{ color: "#d4d4d4" }}>= </span><span style={{ color: "#b5cea8" }}>0</span><span style={{ color: "#d4d4d4" }}>, </span><span style={{ color: "#b5cea8" }}>1</span></div>
            <div className="pl-8"><span style={{ color: "#d4d4d4" }}>result </span><span style={{ color: "#d4d4d4" }}>= []</span></div>
            <div className="pl-8"><span style={{ color: "#c586c0" }}>for</span><span style={{ color: "#d4d4d4" }}> _ </span><span style={{ color: "#c586c0" }}>in </span><span style={{ color: "#dcdcaa" }}>range</span><span style={{ color: "#d4d4d4" }}>(n):</span></div>
            <div className="pl-16"><span style={{ color: "#d4d4d4" }}>result.</span><span style={{ color: "#dcdcaa" }}>append</span><span style={{ color: "#d4d4d4" }}>(a)</span></div>
            <div className="pl-16"><span style={{ color: "#d4d4d4" }}>a, b </span><span style={{ color: "#d4d4d4" }}>= b, a </span><span style={{ color: "#d4d4d4" }}>+ b</span></div>
            <div className="pl-8"><span style={{ color: "#c586c0" }}>return</span><span style={{ color: "#d4d4d4" }}> result</span></div>
            <br />
            <div><span style={{ color: "#dcdcaa" }}>print</span><span style={{ color: "#d4d4d4" }}>(fibonacci(</span><span style={{ color: "#b5cea8" }}>10</span><span style={{ color: "#d4d4d4" }}>))</span></div>
          </div>
          <div className="border-t px-6 py-3 text-xs font-mono" style={{ borderColor: "var(--border)", color: "#4ade80", background: "#0a0e1a" }}>
            $ [0, 1, 1, 2, 3, 5, 8, 13, 21, 34] — executed in 0.08s
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center text-white mb-4">Everything you need</h2>
        <p className="text-center mb-12" style={{ color: "var(--text-secondary)" }}>
          Built for developers who want to code, collaborate, and learn together
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-xl border transition-all hover:border-blue-500/30"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.bg}`}>
                <f.icon size={20} className={f.color} />
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{f.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="p-12 rounded-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <h2 className="text-3xl font-bold text-white mb-4">Ready to start coding?</h2>
          <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
            Join thousands of developers building and learning together
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all hover:scale-105"
          >
            Create Free Account <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        <p>CodePlatform © 2025 — Built with Next.js, Socket.IO, Docker, and AI</p>
      </footer>
    </div>
  )
}
