// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../src/main";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const type = (sel: string, value: string) => {
  $<HTMLInputElement>(sel).value = value;
};
const join = (name: string) => {
  type("#username-input", name);
  $<HTMLFormElement>("#join-form").requestSubmit();
};
const fresh = (storage: Map<string, string>) => {
  document.body.innerHTML = '<div id="app"></div>';
  createApp($("#app"), storage);
};

describe("MSN Messenger Reborn – MVP", () => {
  beforeEach(() => fresh(new Map()));

  it("prompts for a username on visit, with no chat shown yet", () => {
    expect($("#username-input")).not.toBeNull();
    expect($("#chat-box")).toBeNull();
  });

  it("rejects a blank username", () => {
    join("   ");
    expect($("#chat-box")).toBeNull();
    expect($("#join-error").textContent).not.toBe("");
  });

  it("shows message input and send button after joining", () => {
    join("John Doe");
    expect($("#message-input")).not.toBeNull();
    expect($("#send-button")).not.toBeNull();
  });

  it("displays 'John Doe: Hello World!' when Send is clicked", () => {
    join("John Doe");
    type("#message-input", "Hello World!");
    $("#send-button").click();
    expect($("#chat-box").textContent).toContain("John Doe: Hello World!");
    expect($<HTMLInputElement>("#message-input").value).toBe("");
  });

  it("sends when pressing Enter", () => {
    join("John Doe");
    type("#message-input", "Hi there");
    $("#message-input").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect($("#chat-box").textContent).toContain("John Doe: Hi there");
  });

  it("ignores blank messages", () => {
    join("John Doe");
    type("#message-input", "  ");
    $("#send-button").click();
    expect($("#chat-box").children.length).toBe(0);
  });

  it("remembers the username across visits", () => {
    const storage = new Map<string, string>();
    fresh(storage);
    join("Jane");
    fresh(storage);
    expect($("#chat-box")).not.toBeNull();
  });
});
