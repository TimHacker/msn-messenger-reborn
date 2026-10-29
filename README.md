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
npm run dev     # dev server
npm test        # acceptance tests
```

Plan: see [Issues](../../issues) and the project board.
