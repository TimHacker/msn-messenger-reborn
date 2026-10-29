import { WebSocketServer, WebSocket } from "ws";
import type { AddressInfo } from "node:net";

const isValid = (v: unknown): boolean => {
  const m = v as { author?: unknown; text?: unknown; kind?: unknown };
  return typeof m?.author === "string" && typeof m?.text === "string" && m.author.trim() !== "" && m.text.length <= 2000 && (m.kind === undefined || m.kind === "chat" || m.kind === "system");
};

export function createChatServer(port: number): Promise<{ port: number; close: () => void }> {
  const wss = new WebSocketServer({ port });
  wss.on("connection", (client) => {
    client.on("message", (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!isValid(parsed)) return;
      const { author, text, kind } = parsed as { author: string; text: string; kind?: string };
      const out = JSON.stringify(kind === "system" ? { author, text, kind } : { author, text });
      wss.clients.forEach((c) => c.readyState === WebSocket.OPEN && c.send(out));
    });
  });
  return new Promise((resolve) =>
    wss.on("listening", () =>
      resolve({
        port: (wss.address() as AddressInfo).port,
        close: () => {
          wss.clients.forEach((c) => c.terminate());
          wss.close();
        },
      }),
    ),
  );
}
