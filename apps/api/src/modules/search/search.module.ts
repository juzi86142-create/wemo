import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { SearchController } from "./search.controller";
import { SearchPrismaRepository } from "./search.prisma-repository";
import { SEARCH_REPOSITORY } from "./search.repository";
import { SearchService } from "./search.service";

@Module({
  imports: [DatabaseModule],
  controllers: [SearchController],
  providers: [
    SearchService,
    {
      provide: SEARCH_REPOSITORY,
      useClass: SearchPrismaRepository,
    },
  ],
})
export class SearchModule {}
