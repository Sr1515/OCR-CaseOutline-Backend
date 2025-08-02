FROM node:18-alpine AS builder

WORKDIR /app

COPY . .

# Instala dependências
RUN npm install

# Aplica o schema no banco de dados
RUN npx prisma db push

# Compila o projeto
RUN npm run build

EXPOSE 8080

CMD ["node", "dist/main.js"]
