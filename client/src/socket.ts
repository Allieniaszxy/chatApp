import type { DefaultEventsMap } from "@socket.io/component-emitter";
import { io, Socket } from "socket.io-client";

let socket: Socket<DefaultEventsMap, DefaultEventsMap> | null = null;

export function connectSocket(token: unknown) {
  const url =
    import.meta.env.VITE_SOCKET_URL ||
    (import.meta.env.VITE_API
      ? import.meta.env.VITE_API.replace("/api", "")
      : "http://localhost:5000");
  socket = io(url, {
    transports: ["websocket"],
    auth: { token },
  });
  return socket;
}

export function getSocket() {
  return socket;
}
