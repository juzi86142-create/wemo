import { Inject, Injectable } from "@nestjs/common";
import {
  PlatformSettingMutationResponseSchema,
  PlatformSettingMutationSchema,
  PlatformSettingsSnapshotSchema,
} from "@wemo/contracts/platform";

import { AuthorizationService } from "../../runtime/authorization.service";
import { SettingsPrismaRepository } from "./settings.prisma-repository";
import { SETTINGS_REPOSITORY } from "./settings.repository";
import { parseInput } from "../../runtime/validation";
import { RequestContextStore } from "../../runtime/request-context.store";

@Injectable()
export class SettingsService {
  constructor(
    @Inject(SETTINGS_REPOSITORY)
    private readonly repository: SettingsPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  getSnapshot() {
    this.authorization.requireStaffPermission("settings:read");
    const context = this.requestContext.requireContext();
    const settings = this.repository.getSettings({
      market: context.market,
      locale: context.locale,
    });
    return PlatformSettingsSnapshotSchema.parse(
      {
        request_id: context.request_id,
        items: settings,
      },
    );
  }

  updateSetting(body: unknown) {
    this.authorization.requireStaffPermission("settings:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(PlatformSettingMutationSchema, body);
    const item = this.repository.upsertSetting({
      key: input.key,
      value: input.value,
      type: "string",
      market_id: 0,
      locale_id: 0,
      is_public: false,
    });

    return PlatformSettingMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
