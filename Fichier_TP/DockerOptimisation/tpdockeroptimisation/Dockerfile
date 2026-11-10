FROM node:24.22.2-bookworm
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN apt-get update && apt-get install -y build-essential ca-certificates locales && echo "en_US.UTF-8 UTF-8" > /etc/locale.gen && locale-gen
EXPOSE 3000
ENV NODE_ENV=development
RUN npm run build
USER root
CMD ["node", "server.js"]