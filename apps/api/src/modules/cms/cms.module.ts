import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { CmsController } from "./cms.controller";
import { CmsPrismaRepository } from "./cms.prisma-repository";
import { CMS_REPOSITORY } from "./cms.repository";
import { CmsService } from "./cms.service";

@Module({
  imports: [DatabaseModule],
  controllers: [CmsController],
  providers: [
    CmsService,
    {
      provide: CMS_REPOSITORY,
      useClass: CmsPrismaRepository,
    },
  ],
})
export class CmsModule {}
