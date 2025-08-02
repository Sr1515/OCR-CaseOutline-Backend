build:
	docker compose up --build --remove-orphans -d 

logs:
	docker compose logs -f

off:
	docker compose down 

studio:
	npx prisma studio 

run:
	npm run start:dev