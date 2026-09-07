import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsRedisRepository } from "./notifications.redis-repository";
import { NOTIFICATIONS_REPOSITORY } from "./notifications.repository";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    {
      provide: NOTIFICATIONS_REPOSITORY,
      useClass: NotificationsRedisRepository,
    },
  ],
})
export class NotificationsModule {}
