// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createApp } from "../../src/main";
import { InMemoryHub } from "../../src/adapters/realtime/in-memory-hub";

const mount = (hub: InMemoryHub, name: string, storage = new Map<string, string>()) => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  createApp(root, storage, hub.connect());
  if (!root.querySelector('[id="chat-box"]')) {
    (root.querySelector('[id="username-input"]') as HTMLInputElement).value = name;
    (root.querySelector('[id="join-form"]') as HTMLFormElement).requestSubmit();
  }
  return {
    chat: () => root.querySelector('[id="chat-box"]')!.textContent,
    notices: () => [...root.querySelectorAll(".system-notice")].map((n) => n.textContent),
  };
};

describe("Join announcement (bonus #6)", () => {
  it("tells existing users when a new user joins, as a distinct system notice", () => {
    const hub = new InMemoryHub();
    const alice = mount(hub, "Alice");
    mount(hub, "Bob");
    expect(alice.notices()).toContain("Bob joined the chat");
    expect(alice.chat()).not.toContain(": Bob joined the chat");
  });

  it("does not re-announce a returning user restored from a saved session", () => {
    const hub = new InMemoryHub();
    const alice = mount(hub, "Alice");
    const saved = new Map([["msn-username", "Bob"]]);
    mount(hub, "Bob", saved);
    expect(alice.notices()).toEqual([]);
  });
});
