import { createServer } from "node:http";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import type { AddressInfo } from "node:net";

export interface ServerOptions {
  maxConnections?: number;
  /** Messages a connection may send in a burst. */
  burst?: number;
  /** Sustained messages per second per connection. */
  perSecond?: number;
}

const MAX_AUTHOR = 32;
const MAX_TEXT = 2000;
const MAX_PAYLOAD = 4096;
const MAX_BUFFERED = 1_000_000;
const RESERVED_NAMES = new Set(["server", "system"]);
const SERVER_NAME = "Server";

interface Incoming {
  author: string;
  text: string;
  kind: "chat" | "join";
}

/** Returns null for anything malformed, oversized, or a kind clients may not send (e.g. "system"). */
function parse(raw: RawData): Incoming | null {
  let v: { author?: unknown; text?: unknown; kind?: unknown };
  try {
    v = JSON.parse(raw.toString());
  } catch {
    return null;
  }
  if (typeof v?.author !== "string" || typeof v.text !== "string") return null;
  const author = v.author.trim();
  if (author === "" || author.length > MAX_AUTHOR || v.text.length > MAX_TEXT) return null;
  if (v.kind === "join") return { author, text: "", kind: "join" };
  if (v.kind !== undefined && v.kind !== "chat") return null;
  if (v.text.trim() === "") return null;
  return { author, text: v.text, kind: "chat" };
}

interface Connection {
  name: string | null;
  alive: boolean;
  tokens: number;
  refilledAt: number;
}

export function createChatServer(
  port: number,
  { maxConnections = 200, burst = 10, perSecond = 5 }: ServerOptions = {},
): Promise<{ port: number; clientCount: () => number; close: () => void }> {
  // Plain HTTP answers health checks; WebSocket upgrades share the same port.
  const http = createServer((req, res) => {
    res.writeHead(req.url === "/healthz" ? 200 : 404).end(req.url === "/healthz" ? "ok" : undefined);
  });
  const wss = new WebSocketServer({ server: http, maxPayload: MAX_PAYLOAD });
  const connections = new Map<WebSocket, Connection>();
  const owners = new Map<string, WebSocket>(); // lower-cased name -> connection

  const send = (c: WebSocket, payload: unknown) => {
    if (c.readyState !== WebSocket.OPEN) return;
    if (c.bufferedAmount > MAX_BUFFERED) return c.terminate(); // slow consumer
    c.send(JSON.stringify(payload));
  };
  const notice = (c: WebSocket, text: string) => send(c, { author: SERVER_NAME, text, kind: "system" });
  const broadcast = (payload: unknown, except?: WebSocket) =>
    wss.clients.forEach((c) => c !== except && send(c, payload));

  const withinRate = (state: Connection) => {
    const now = Date.now();
    state.tokens = Math.min(burst, state.tokens + ((now - state.refilledAt) / 1000) * perSecond);
    state.refilledAt = now;
    if (state.tokens < 1) return false;
    state.tokens -= 1;
    return true;
  };

  /** Binds a name to the connection. Returns the canonical name, or null (and tells the sender why). */
  const claim = (client: WebSocket, state: Connection, name: string): string | null => {
    if (state.name) {
      if (state.name.toLowerCase() === name.toLowerCase()) return state.name;
      notice(client, "You can't post as another user.");
      return null;
    }
    const key = name.toLowerCase();
    if (RESERVED_NAMES.has(key) || owners.has(key)) {
      notice(client, "That name is not available.");
      return null;
    }
    owners.set(key, client);
    state.name = name;
    return name;
  };

  wss.on("connection", (client) => {
    if (wss.clients.size > maxConnections) return client.terminate();
    const state: Connection = { name: null, alive: true, tokens: burst, refilledAt: Date.now() };
    connections.set(client, state);
    client.on("error", () => {}); // e.g. frame over maxPayload; ws closes the socket itself
    client.on("pong", () => (state.alive = true));
    client.on("close", () => {
      connections.delete(client);
      if (state.name && owners.get(state.name.toLowerCase()) === client) owners.delete(state.name.toLowerCase());
    });
    client.on("message", (raw) => {
      if (!withinRate(state)) return client.close(1008, "rate limit");
      const msg = parse(raw);
      if (!msg) return;
      if (msg.kind === "join") {
        const isNew = state.name === null;
        const name = claim(client, state, msg.author);
        if (name && isNew) broadcast({ author: name, text: `${name} joined the chat`, kind: "system" }, client);
        return;
      }
      const name = claim(client, state, msg.author);
      if (name) broadcast({ author: name, text: msg.text });
    });
  });

  const heartbeat = setInterval(() => {
    connections.forEach((state, c) => {
      if (!state.alive) return c.terminate();
      state.alive = false;
      c.ping();
    });
  }, 30_000);
  heartbeat.unref();

  return new Promise((resolve) => {
    http.listen(port, () =>
      resolve({
        port: (http.address() as AddressInfo).port,
        clientCount: () => wss.clients.size,
        close: () => {
          clearInterval(heartbeat);
          wss.clients.forEach((c) => c.terminate());
          wss.close();
          http.close();
        },
      }),
    );
  });
}
