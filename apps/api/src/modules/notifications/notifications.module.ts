import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { EmailSenderService } from "./email-sender.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsRedisRepository } from "./notifications.redis-repository";
import { NOTIFICATIONS_REPOSITORY } from "./notifications.repository";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailSenderService,
    {
      provide: NOTIFICATIONS_REPOSITORY,
      useClass: NotificationsRedisRepository,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
