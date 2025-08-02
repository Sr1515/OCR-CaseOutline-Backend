import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: 'http://localhost:8080',
    credentials: true,
  });

  console.log(process.env);

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
