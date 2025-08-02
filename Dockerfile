FROM node:18-alpine AS builder

WORKDIR /app

RUN npm install

COPY . .

RUN npm run build

RUN npx prisma migrate deploy

EXPOSE 3000

CMD ["node", "dist/main.js"]
