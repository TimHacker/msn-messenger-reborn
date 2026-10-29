import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { AddressInfo } from "node:net";

const isValid = (v: unknown): boolean => {
  const m = v as { author?: unknown; text?: unknown; kind?: unknown };
  return typeof m?.author === "string" && typeof m?.text === "string" && m.author.trim() !== "" && m.text.length <= 2000 && (m.kind === undefined || m.kind === "chat" || m.kind === "system");
};

export function createChatServer(
  port: number,
): Promise<{ port: number; clientCount: () => number; close: () => void }> {
  // Plain HTTP answers health checks; WebSocket upgrades share the same port.
  const http = createServer((req, res) => {
    res.writeHead(req.url === "/healthz" ? 200 : 404).end(req.url === "/healthz" ? "ok" : undefined);
  });
  const wss = new WebSocketServer({ server: http });
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
  return new Promise((resolve) => {
    http.listen(port, () =>
      resolve({
        port: (http.address() as AddressInfo).port,
        clientCount: () => wss.clients.size,
        close: () => {
          wss.clients.forEach((c) => c.terminate());
          wss.close();
          http.close();
        },
      }),
    );
  });
}
