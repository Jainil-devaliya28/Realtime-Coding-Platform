import { io, Socket } from "socket.io-client"
import type { ServerToClientEvents, ClientToServerEvents } from "@code-platform/shared"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000"

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on("connect", () => console.log("Socket connected:", socket?.id))
    socket.on("disconnect", (reason) => console.log("Socket disconnected:", reason))
    socket.on("connect_error", (err) => console.error("Socket connection error:", err.message))
  }
  return socket
}

export function connectSocket(): void {
  const s = getSocket()
  if (!s.connected) s.connect()
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
    socket = null
  }
}
