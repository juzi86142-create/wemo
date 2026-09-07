import { Inject, Injectable } from "@nestjs/common";
import {
  PlatformSettingMutationResponseSchema,
  PlatformSettingMutationSchema,
  PlatformSettingsSnapshotSchema,
} from "@wemo/contracts/platform";

import { AuthorizationService } from "../../runtime/authorization.service";
import { parseInput } from "../../runtime/validation";
import { PlatformRepository } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";

@Injectable()
export class SettingsService {
  constructor(
    @Inject(PlatformRepository)
    private readonly stateStore: PlatformRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async getSnapshot() {
    this.authorization.requireStaffPermission("settings:read");
    return PlatformSettingsSnapshotSchema.parse(
      await this.stateStore.snapshotSettings(this.requestContext.requireContext().request_id),
    );
  }

  async updateSetting(body: unknown) {
    this.authorization.requireStaffPermission("settings:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(PlatformSettingMutationSchema, body);
    const item = await this.stateStore.upsertSetting(
      {
        group_name: input.group_name,
        key: input.key,
        value: input.value,
        expected_version: input.expected_version,
        is_sensitive: input.is_sensitive,
      },
      context,
    );

    return PlatformSettingMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}

