import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthController } from "./auth.controller";
import { AuthPrismaRepository } from "./auth.prisma-repository";
import { AUTH_REPOSITORY } from "./auth.repository";
import { AuthService } from "./auth.service";
import { SessionActorResolver } from "./session-actor-resolver";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionActorResolver,
    {
      provide: AUTH_REPOSITORY,
      useClass: AuthPrismaRepository,
    },
  ],
  exports: [SessionActorResolver],
})
export class AuthModule {}
