# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copia package.json e package-lock.json para cache de dependências
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia todo o código
COPY . .

# Gera o Prisma Client (gera os arquivos necessários para o client funcionar)
RUN npx prisma generate

# Build da aplicação NestJS
RUN npm run build

# Stage 2: Produção
FROM node:18-alpine

WORKDIR /app

# Copia arquivos buildados e node_modules do builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Expõe a porta do app (ajuste se necessário)
EXPOSE 3000

# Comando para rodar a aplicação
CMD ["node", "dist/main.js"]
