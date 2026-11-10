FROM node:24.22.2-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
ENV NODE_ENV=development
RUN npm run build
USER root
CMD ["node", "server.js"]