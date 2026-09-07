import { Inject, Injectable } from "@nestjs/common";
import {
  PlatformSettingMutationResponseSchema,
  PlatformSettingMutationSchema,
  PlatformSettingsSnapshotSchema,
} from "@wemo/contracts/platform";

import { AUDIT_REPOSITORY, type AuditRepository } from "../audit/audit.repository";
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
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepository: AuditRepository,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async getSnapshot() {
    this.authorization.requireStaffPermission("settings:read");
    const context = this.requestContext.requireContext();
    const settings = await this.repository.getSettings({});
    return PlatformSettingsSnapshotSchema.parse(
      {
        request_id: context.request_id,
        items: settings,
      },
    );
  }

  async updateSetting(body: unknown) {
    const actor = this.authorization.requireStaffPermission("settings:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(PlatformSettingMutationSchema, body);
    const item = await this.repository.upsertSetting(input);
    await this.auditRepository.recordLog({
      actor_id: actor.user_id,
      action: "settings.update",
      entity: "system_setting",
      entity_id: item.id ?? 0,
      after: { group_name: input.group_name, key: input.key },
      request_id: context.request_id,
    });

    return PlatformSettingMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
