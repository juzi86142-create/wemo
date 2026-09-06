import { Body, Controller, Get, Inject, Patch } from "@nestjs/common";

import { SettingsService } from "./settings.service";

@Controller("admin/settings")
export class SettingsController {
  constructor(
    @Inject(SettingsService)
    private readonly settingsService: SettingsService,
  ) {}

  @Get()
  getSnapshot() {
    return this.settingsService.getSnapshot();
  }

  @Patch()
  updateSetting(@Body() body: unknown) {
    return this.settingsService.updateSetting(body);
  }
}
