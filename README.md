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
The GitHub Pages deployment is static. It reads the WebSocket URL from the `VITE_WS_URL` repository variable; if unset it runs in local-only mode.

## Deploy the WebSocket server (Azure Container Apps)
```
az login
az group create -n msn-rg -l uksouth
az containerapp up -n msn-ws --resource-group msn-rg --location uksouth \
  --source . --ingress external --target-port 8080
# copy the app FQDN, then point the Pages build at it and redeploy:
gh variable set VITE_WS_URL --body "wss://<fqdn>"
gh workflow run "Deploy to GitHub Pages"
```
Any Docker host works (the `Dockerfile` runs `server/index.ts` on `$PORT`, default 8080).

Joining explicitly (not restoring a saved session on reload) broadcasts a `"system"` message ("Bob joined the chat") to everyone; the UI renders it as a distinct `.system-notice` line. `ChatMessageDto.kind` is optional (`"chat"` by default), so older clients/messages still work.

Plan: see [Issues](../../issues) and the project board.
