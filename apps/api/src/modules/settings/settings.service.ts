import { Inject, Injectable } from "@nestjs/common";
import {
  PlatformSettingMutationResponseSchema,
  PlatformSettingMutationSchema,
  PlatformSettingsSnapshotSchema,
} from "@wemo/contracts/platform";

import { AuthorizationService } from "../../runtime/authorization.service";
import { parseInput } from "../../runtime/validation";
import { PlatformStateStore } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";

@Injectable()
export class SettingsService {
  constructor(
    @Inject(PlatformStateStore)
    private readonly stateStore: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  getSnapshot() {
    this.authorization.requireStaffPermission("settings:read");
    return PlatformSettingsSnapshotSchema.parse(
      this.stateStore.snapshotSettings(this.requestContext.requireContext().request_id),
    );
  }

  updateSetting(body: unknown) {
    this.authorization.requireStaffPermission("settings:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(PlatformSettingMutationSchema, body);
    const item = this.stateStore.upsertSetting(
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
