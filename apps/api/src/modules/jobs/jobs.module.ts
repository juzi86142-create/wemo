import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { JobsController } from "./jobs.controller";
import { JobsPrismaRepository } from "./jobs.prisma-repository";
import { JOBS_REPOSITORY } from "./jobs.repository";
import { JobsService } from "./jobs.service";

@Module({
  imports: [DatabaseModule],
  controllers: [JobsController],
  providers: [
    JobsService,
    {
      provide: JOBS_REPOSITORY,
      useClass: JobsPrismaRepository,
    },
  ],
})
export class JobsModule {}
