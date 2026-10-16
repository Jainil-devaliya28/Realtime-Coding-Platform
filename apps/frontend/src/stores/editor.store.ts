import { create } from "zustand"
import type { Language, CollaborationUser } from "@code-platform/shared"

interface ExecutionState {
  jobId: string | null
  isRunning: boolean
  output: string
  errorOutput: string
  exitCode: number | null
  executionTime: number | null
  status: string | null
  memoryUsed?: number | null
}

interface EditorState {
  code: string
  language: Language
  version: number
  stdin: string
  collaborators: CollaborationUser[]
  execution: ExecutionState
  isConnected: boolean
  roomId: string | null
  isSaving: boolean

  setCode: (code: string) => void
  setLanguage: (lang: Language) => void
  setVersion: (v: number) => void
  setStdin: (stdin: string) => void
  setCollaborators: (users: CollaborationUser[]) => void
  addCollaborator: (user: CollaborationUser) => void
  removeCollaborator: (userId: string) => void
  updateCollaboratorCursor: (userId: string, cursor: { lineNumber: number; column: number }) => void
  setIsConnected: (v: boolean) => void
  setRoomId: (id: string) => void
  setIsSaving: (v: boolean) => void

  startExecution: (jobId: string) => void
  appendOutput: (chunk: string, stream: "stdout" | "stderr") => void
  completeExecution: (result: {
    exitCode: number; executionTime: number; status: string; stdout: string; stderr: string; memoryUsed?: number
  }) => void
  resetExecution: () => void
}

const initialExecution: ExecutionState = {
  jobId: null,
  isRunning: false,
  output: "",
  errorOutput: "",
  exitCode: null,
  executionTime: null,
  status: null,
  memoryUsed: null,
}

export const useEditorStore = create<EditorState>((set) => ({
  code: "",
  language: "python",
  version: 0,
  stdin: "",
  collaborators: [],
  execution: initialExecution,
  isConnected: false,
  roomId: null,
  isSaving: false,

  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  setVersion: (version) => set({ version }),
  setStdin: (stdin) => set({ stdin }),
  setCollaborators: (collaborators) => set({ collaborators }),

  addCollaborator: (user) =>
    set((state) => ({
      collaborators: [...state.collaborators.filter((u) => u.userId !== user.userId), user],
    })),

  removeCollaborator: (userId) =>
    set((state) => ({
      collaborators: state.collaborators.filter((u) => u.userId !== userId),
    })),

  updateCollaboratorCursor: (userId, cursor) =>
    set((state) => ({
      collaborators: state.collaborators.map((u) =>
        u.userId === userId ? { ...u, cursor } : u
      ),
    })),

  setIsConnected: (isConnected) => set({ isConnected }),
  setRoomId: (roomId) => set({ roomId }),
  setIsSaving: (isSaving) => set({ isSaving }),

  startExecution: (jobId) =>
    set({ execution: { ...initialExecution, jobId, isRunning: true } }),

  appendOutput: (chunk, stream) =>
    set((state) => ({
      execution: {
        ...state.execution,
        output: stream === "stdout" ? state.execution.output + chunk : state.execution.output,
        errorOutput: stream === "stderr" ? state.execution.errorOutput + chunk : state.execution.errorOutput,
      },
    })),

  completeExecution: (result) =>
    set((state) => ({
      execution: {
        ...state.execution,
        isRunning: false,
        exitCode: result.exitCode,
        executionTime: result.executionTime,
        status: result.status,
        memoryUsed: result.memoryUsed,
        output: result.stdout || state.execution.output,
        errorOutput: result.stderr || state.execution.errorOutput,
      },
    })),

  resetExecution: () => set({ execution: initialExecution }),
}))
