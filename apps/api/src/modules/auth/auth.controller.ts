import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { AuthService } from "./auth.service";

/** 登录注册找回等敏感接口每 IP 每分钟 10 次 */
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  @Post("register")
  @HttpCode(200)
  register(@Body() body: unknown) {
    return this.authService.register(body);
  }

  @Post("login")
  @HttpCode(200)
  login(@Body() body: unknown) {
    return this.authService.login(body);
  }

  @Post("verify-email")
  @HttpCode(200)
  verifyEmail(@Body() body: unknown) {
    return this.authService.verifyEmail(body);
  }

  @Post("forgot-password")
  @HttpCode(200)
  forgotPassword(@Body() body: unknown) {
    return this.authService.forgotPassword(body);
  }

  @Post("reset-password")
  @HttpCode(200)
  resetPassword(@Body() body: unknown) {
    return this.authService.resetPassword(body);
  }

  @Post("change-password")
  @HttpCode(200)
  changePassword(@Body() body: unknown) {
    return this.authService.changePassword(body);
  }

  @Get("sessions")
  listSessions(@Query() query: unknown) {
    return this.authService.listSessions(query);
  }

  @Post("revoke-other-sessions")
  @HttpCode(200)
  revokeOtherSessions() {
    return this.authService.revokeOtherSessions();
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Body() body: unknown) {
    return this.authService.logout(body);
  }
}
