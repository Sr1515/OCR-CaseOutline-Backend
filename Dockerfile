FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install
RUN npx prisma generate
RUN npm run build

EXPOSE 8080

CMD ["sh", "-c", "npx prisma db push && node dist/main.js"]
