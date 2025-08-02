FROM node:18-alpine AS builder

WORKDIR /app

COPY . .

# Instala dependências
RUN npm install

# Gera o cliente Prisma (antes do build, se for necessário)
RUN npx prisma generate

# Compila o projeto
RUN npm run build

# Aplica o schema no banco de dados
RUN npx prisma db push

EXPOSE 8080

CMD ["node", "dist/main.js"]
