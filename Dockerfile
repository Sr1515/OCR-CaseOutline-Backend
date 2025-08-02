FROM node:18-alpine AS builder

WORKDIR /app

COPY . .

RUN npm install

RUN npm run build

RUN npx prisma migrate deploy

EXPOSE 8080

CMD ["node", "dist/main.js"]
