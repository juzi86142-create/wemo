import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";

import { AppModule } from "./app.module";
import { configureApplication } from "./http/configure-application";

const port = Number(process.env.API_PORT ?? 4000);

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: true }),
);

configureApplication(app);

await app.listen(port, "0.0.0.0");
