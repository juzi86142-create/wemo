import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthController } from "./auth.controller";
import { AuthPrismaRepository } from "./auth.prisma-repository";
import { AUTH_REPOSITORY } from "./auth.repository";
import { AuthService } from "./auth.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: AUTH_REPOSITORY,
      useClass: AuthPrismaRepository,
    },
  ],
})
export class AuthModule {}
