import { Module } from "@nestjs/common";

import { ExperienceStateModule } from "../../runtime/experience-state.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [ExperienceStateModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
