import { describe, it, expect, afterEach } from "vitest";
import { createChatServer } from "../../server/chat-server";
import { WebSocketGateway } from "../../src/adapters/realtime/websocket-gateway";
import type { ChatMessageDto } from "../../src/application/ports";

const until = async (cond: () => boolean) => {
  for (let i = 0; i < 100 && !cond(); i++) await new Promise((r) => setTimeout(r, 20));
  expect(cond()).toBe(true);
};

describe("WebSocket server (bonus #5)", () => {
  const closers: Array<() => void> = [];
  afterEach(() => closers.splice(0).forEach((c) => c()));

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

  it("broadcasts system notices and drops an unknown kind", async () => {
    const server = await createChatServer(0);
    closers.push(() => server.close());
    const url = `ws://localhost:${server.port}`;
    const a = new WebSocketGateway(url);
    const b = new WebSocketGateway(url);
    closers.push(() => a.close(), () => b.close());
    const got: ChatMessageDto[] = [];
    b.subscribe((m) => got.push(m));
    await until(() => server.clientCount() === 2);
    a.publish({ author: "Bob", text: "Bob joined the chat", kind: "bogus" as "system" });
    a.publish({ author: "Bob", text: "Bob joined the chat", kind: "system" });
    await until(() => got.length === 1);
    await new Promise((r) => setTimeout(r, 100));
    expect(got).toEqual([{ author: "Bob", text: "Bob joined the chat", kind: "system" }]);
  });
});
