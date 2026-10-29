import { createChatServer } from "./chat-server.ts";

const port = Number(process.env.PORT ?? 3001);
const { port: bound } = await createChatServer(port);
console.log(`Chat server listening on ws://localhost:${bound}`);
