import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";

import { AppModule } from "./app.module";

const port = Number(process.env.API_PORT ?? 4000);

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: true }),
);

app.setGlobalPrefix("api/v1");
app.enableCors({
  credentials: true,
  origin: [process.env.STOREFRONT_URL ?? "http://localhost:3000"],
});

await app.listen(port, "0.0.0.0");
