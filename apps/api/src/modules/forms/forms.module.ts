import { Module } from "@nestjs/common";

import { ExperienceStateModule } from "../../runtime/experience-state.module";
import { FormsController } from "./forms.controller";
import { FormsService } from "./forms.service";

@Module({
  imports: [ExperienceStateModule],
  controllers: [FormsController],
  providers: [FormsService],
})
export class FormsModule {}
