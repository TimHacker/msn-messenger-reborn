# MSN Messenger Reborn

A chat app inspired by MSN Messenger. Built with ATDD (red/green/refactor) and hexagonal architecture.

```
src/domain        entities/value objects (Username, Message) – no dependencies
src/application   use cases (ChatService) + ports (SessionStore)
src/adapters      UI (DOM) and storage (localStorage) implementing/driving the ports
src/main.ts       composition root
tests/acceptance  user-story tests driving the app through the UI
```

## Run
```
npm install
npm test                                   # acceptance tests
npm run server                             # WebSocket server on ws://localhost:3001
VITE_WS_URL=ws://localhost:3001 npm run dev  # real-time mode: open two browser windows
npm run dev                                # no VITE_WS_URL = local-only (messages stay in this tab)
```

The `MessageGateway` port has two adapters: `InMemoryHub` (local/tests) and `WebSocketGateway` (browser), served by `server/chat-server.ts`.
The GitHub Pages deployment is static and has no WebSocket server, so it runs in local-only mode.

Plan: see [Issues](../../issues) and the project board.
