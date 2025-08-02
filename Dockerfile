# Stage 1 - Build
FROM node:18-alpine AS builder

# Diretório de trabalho
WORKDIR /app

# Copia package.json e package-lock.json para aproveitar cache
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia todo o código da aplicação
COPY . .

# Gera Prisma Client
RUN npx prisma generate

# Build do NestJS (assumindo que o comando seja npm run build)
RUN npm run build


# Stage 2 - Produção
FROM node:18-alpine

WORKDIR /app

# Copia build e node_modules do estágio anterior
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/package*.json ./

# Expor a porta da aplicação
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "dist/main.js"]
