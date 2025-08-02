# Stage 1 - Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copia package.json e package-lock.json para cache
COPY package*.json ./

RUN npm install

# Copia o restante do código
COPY . .

# Gera o client do Prisma
RUN npx prisma generate

# Build do NestJS
RUN npm run build


# Stage 2 - Produção
FROM node:18-alpine

WORKDIR /app

# Copia build, node_modules e o client do Prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
