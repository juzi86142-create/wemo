import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { SeoController } from "./seo.controller";
import { SeoPrismaRepository } from "./seo.prisma-repository";
import { SEO_REPOSITORY } from "./seo.repository";
import { SeoService } from "./seo.service";

@Module({
  imports: [DatabaseModule],
  controllers: [SeoController],
  providers: [
    SeoService,
    {
      provide: SEO_REPOSITORY,
      useClass: SeoPrismaRepository,
    },
  ],
})
export class SeoModule {}
