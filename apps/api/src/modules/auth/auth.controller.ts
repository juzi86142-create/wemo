import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
} from "@nestjs/common";

import { AuthService } from "./auth.service";

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

  @Get("sessions")
  listSessions(@Query() query: unknown) {
    return this.authService.listSessions(query);
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Body() body: unknown) {
    return this.authService.logout(body);
  }
}
