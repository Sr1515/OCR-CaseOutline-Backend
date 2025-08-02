FROM node:18-alpine AS builder

WORKDIR /app

RUN npm install

COPY . .

RUN npm run build

RUN npx prisma migrate deploy

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
