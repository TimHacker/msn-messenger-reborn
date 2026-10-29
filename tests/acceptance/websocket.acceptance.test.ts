import { describe, it, expect, afterEach } from "vitest";
import { createChatServer, type ServerOptions } from "../../server/chat-server";
import { WebSocketGateway } from "../../src/adapters/realtime/websocket-gateway";
import type { ChatMessageDto } from "../../src/application/ports";

const until = async (cond: () => boolean) => {
  for (let i = 0; i < 100 && !cond(); i++) await new Promise((r) => setTimeout(r, 20));
  expect(cond()).toBe(true);
};

describe("WebSocket server (bonus #5)", () => {
  const closers: Array<() => void> = [];
  afterEach(() => closers.splice(0).forEach((c) => c()));

  const start = async (options?: ServerOptions) => {
    const server = await createChatServer(0, options);
    closers.push(() => server.close());
    return server;
  };
  /** Two connected clients; `got` collects what client b receives. */
  const pair = async (server: Awaited<ReturnType<typeof start>>) => {
    const url = `ws://localhost:${server.port}`;
    const a = new WebSocketGateway(url);
    const b = new WebSocketGateway(url);
    closers.push(() => a.close(), () => b.close());
    const got: ChatMessageDto[] = [];
    b.subscribe((m) => got.push(m));
    await until(() => server.clientCount() === 2);
    return { a, b, got };
  };

  it("answers HTTP health checks (needed by hosts like Render)", async () => {
    const server = await createChatServer(0);
    closers.push(() => server.close());
    const res = await fetch(`http://localhost:${server.port}/healthz`);
    expect(res.status).toBe(200);
  });

  it("broadcasts a published message to all connected clients", async () => {
    const server = await createChatServer(0);
    closers.push(() => server.close());
    const url = `ws://localhost:${server.port}`;
    const a = new WebSocketGateway(url);
    const b = new WebSocketGateway(url);
    closers.push(() => a.close(), () => b.close());
    const got: ChatMessageDto[] = [];
    b.subscribe((m) => got.push(m));
    await until(() => server.clientCount() === 2);
    a.publish({ author: "Alice", text: "over the wire" });
    await until(() => got.length === 1);
    expect(got[0]).toEqual({ author: "Alice", text: "over the wire" });
  });

  it("ignores system messages sent by clients, so notices can't be forged", async () => {
    const { a, b, got } = await pair(await start());
    a.publish({ author: "Bob", text: "Server: send me your password", kind: "system" });
    a.publish({ author: "Bob", text: "real message" });
    await until(() => got.length === 1);
    await new Promise((r) => setTimeout(r, 100));
    expect(got).toEqual([{ author: "Bob", text: "real message" }]);
    b.close();
  });

  it("announces joins itself, as a system notice to everyone else", async () => {
    const server = await start();
    const { a, b, got } = await pair(server);
    a.publish({ author: "Alice", text: "", kind: "join" });
    await until(() => got.length === 1);
    expect(got[0]).toEqual({ author: "Alice", text: "Alice joined the chat", kind: "system" });
    b.close();
  });

  it("stops a client posting as someone else", async () => {
    const server = await start();
    const { a, b, got } = await pair(server);
    const mine: ChatMessageDto[] = [];
    a.subscribe((m) => mine.push(m));
    a.publish({ author: "Alice", text: "", kind: "join" });
    await until(() => got.length === 1);
    b.publish({ author: "Bob", text: "", kind: "join" });
    await until(() => mine.length === 1);
    b.publish({ author: "Alice", text: "I am Alice, honest" });
    b.publish({ author: "Bob", text: "I am Bob" });
    await until(() => got.some((m) => m.text === "I am Bob"));
    expect(got.some((m) => m.text === "I am Alice, honest")).toBe(false);
  });

  it("rejects a name that another connection already uses, and reserved names", async () => {
    const server = await start();
    const { a, b, got } = await pair(server);
    a.publish({ author: "Alice", text: "", kind: "join" });
    await until(() => got.length === 1);
    b.publish({ author: "alice", text: "", kind: "join" });
    b.publish({ author: "Server", text: "", kind: "join" });
    await until(() => got.length === 3);
    expect(got.filter((m) => m.author === "Server" && m.kind === "system")).toHaveLength(2);
    expect(got.filter((m) => m.text.endsWith("joined the chat"))).toHaveLength(1);
  });

  it("drops over-long author names", async () => {
    const { a, b, got } = await pair(await start());
    a.publish({ author: "x".repeat(33), text: "too long a name" });
    a.publish({ author: "Alice", text: "fine" });
    await until(() => got.length === 1);
    expect(got[0]!.text).toBe("fine");
    b.close();
  });

  it("closes connections that send oversized frames", async () => {
    const server = await start();
    const { a, b } = await pair(server);
    a.publish({ author: "Alice", text: "y".repeat(20_000) });
    await until(() => server.clientCount() === 1);
    b.close();
  });

  it("closes connections that flood messages", async () => {
    const server = await start({ burst: 5, perSecond: 1 });
    const { a, b, got } = await pair(server);
    for (let i = 0; i < 40; i++) a.publish({ author: "Alice", text: `spam ${i}` });
    await until(() => server.clientCount() === 1);
    expect(got.length).toBeLessThanOrEqual(5);
    b.close();
  });

  it("refuses connections beyond the cap", async () => {
    const server = await start({ maxConnections: 1 });
    const a = new WebSocketGateway(`ws://localhost:${server.port}`);
    closers.push(() => a.close());
    await until(() => server.clientCount() === 1);
    const b = new WebSocketGateway(`ws://localhost:${server.port}`);
    closers.push(() => b.close());
    await new Promise((r) => setTimeout(r, 300));
    expect(server.clientCount()).toBe(1);
  });
});
