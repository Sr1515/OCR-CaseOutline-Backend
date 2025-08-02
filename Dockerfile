FROM node:18-alpine AS builder

WORKDIR /app

COPY . .

RUN npm install

RUN npm run build

RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/main.js"]
