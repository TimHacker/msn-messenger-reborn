FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
ENV PORT=8080
EXPOSE 8080
USER node
CMD ["node", "server/index.ts"]
