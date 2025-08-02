FROM node:18-alpine AS builder

WORKDIR /

COPY . .

RUN npm install

RUN ls -a 

RUN cat .env

RUN npm run build

RUN npx prisma migrate deploy

EXPOSE 3000

CMD ["node", "dist/main.js"]
