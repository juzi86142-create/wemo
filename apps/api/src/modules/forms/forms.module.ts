import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { FormsController } from "./forms.controller";
import { FormsPrismaRepository } from "./forms.prisma-repository";
import { FORMS_REPOSITORY } from "./forms.repository";
import { FormsService } from "./forms.service";

@Module({
  imports: [DatabaseModule],
  controllers: [FormsController],
  providers: [
    FormsService,
    {
      provide: FORMS_REPOSITORY,
      useClass: FormsPrismaRepository,
    },
  ],
})
export class FormsModule {}
