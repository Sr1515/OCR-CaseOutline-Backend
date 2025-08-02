# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copia package.json e package-lock.json para cache de dependências
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia todo o código para o container
COPY . .

# Gera o Prisma Client
RUN npx prisma generate

# Build do projeto NestJS
RUN npm run build


# Stage 2: Produção
FROM node:18-alpine

WORKDIR /app

# Copia arquivos buildados e node_modules do stage anterior
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Expõe a porta (ajuste conforme seu app)
EXPOSE 3000

# Comando para rodar o app
CMD ["node", "dist/main.js"]
