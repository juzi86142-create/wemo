import {
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import {
  EntityIdSchema,
} from "@wemo/contracts/common";
import {
  IdentityAddressCreateSchema,
  IdentityAddressListResponseSchema,
  IdentityAddressMutationResponseSchema,
  IdentityDataRequestCreateSchema,
  IdentityDataRequestListResponseSchema,
  IdentityDataRequestMutationResponseSchema,
  IdentityNotificationListQuerySchema,
  IdentityNotificationListResponseSchema,
  IdentityPermissionUpdateSchema,
  IdentityProfileResponseSchema,
  IdentityProfileUpdateSchema,
  IdentityRoleListResponseSchema,
  IdentityRoleMutationResponseSchema,
  IdentitySubscriptionListResponseSchema,
  IdentitySubscriptionMutationResponseSchema,
  IdentitySubscriptionUpsertSchema,
  IdentityUserMutationResponseSchema,
} from "@wemo/contracts/identity";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { PlatformRepository } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";
import { IdentityRepository } from "./identity.state";

const UserIdParamSchema = z.object({
  id: EntityIdSchema,
});

function listResponse<T>(items: T[]): {
  items: T[];
  page: number;
  page_size: number;
  total: number;
} {
  return {
    items,
    page: 1,
    page_size: Math.max(items.length, 1),
    total: items.length,
  };
}

@Injectable()
export class IdentityService {
  constructor(
    @Inject(IdentityRepository)
    private readonly stateStore: IdentityRepository,
    @Inject(PlatformRepository)
    private readonly platformState: PlatformRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async getProfile() {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const item = {
      user: await this.stateStore.getUserById(actor.user_id),
      permissions: actor.permissions,
      addresses: await this.stateStore.listAddresses(actor.user_id),
      subscriptions: await this.stateStore.listSubscriptions(actor.user_id),
      dealer_context: await this.stateStore.getDealerContextForUser(actor.user_id),
    };

    return IdentityProfileResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async updateProfile(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(IdentityProfileUpdateSchema, body);
    const before = await this.stateStore.getUserById(actor.user_id);
    const item = await this.stateStore.updateProfile(actor.user_id, input);

    await this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "identity.profile.update",
      entity: "user",
      entity_id: actor.user_id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return IdentityUserMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listAddresses() {
    const actor = this.authorization.requireActor();
    return IdentityAddressListResponseSchema.parse(
      listResponse(await this.stateStore.listAddresses(actor.user_id)),
    );
  }

  async createAddress(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(IdentityAddressCreateSchema, body);
    const item = await this.stateStore.addAddress(actor.user_id, input);

    await this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "identity.address.create",
      entity: "address",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return IdentityAddressMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listSubscriptions() {
    const actor = this.authorization.requireActor();
    return IdentitySubscriptionListResponseSchema.parse(
      listResponse(await this.stateStore.listSubscriptions(actor.user_id)),
    );
  }

  async upsertSubscription(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(IdentitySubscriptionUpsertSchema, body);
    const before = (await this.stateStore.listSubscriptions(actor.user_id)).find(
      (entry) => entry.channel === input.channel,
    );
    const item = await this.stateStore.upsertSubscription(actor.user_id, input);

    await this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "identity.subscription.upsert",
      entity: "subscription",
      entity_id: item.id,
      before: before ?? null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return IdentitySubscriptionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listDataRequests() {
    const actor = this.authorization.requireActor();
    return IdentityDataRequestListResponseSchema.parse(
      listResponse(await this.stateStore.listDataRequests(actor.user_id)),
    );
  }

  async createDataRequest(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(IdentityDataRequestCreateSchema, body);
    const item = await this.stateStore.createDataRequest(actor.user_id, {
      kind: input.kind,
      request_id: context.request_id,
      notes: input.notes ?? null,
    });

    await this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "identity.data_request.create",
      entity: "data_request",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return IdentityDataRequestMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listNotifications(query: unknown) {
    const actor = this.authorization.requireActor();
    const parsed = parseInput(IdentityNotificationListQuerySchema, query);
    const dealerContext = await this.stateStore.getDealerContextForUser(actor.user_id);
    const companyId = dealerContext?.company_id ?? undefined;
    if (
      parsed.recipient_user_id !== undefined &&
      parsed.recipient_user_id !== actor.user_id
    ) {
      throw new ForbiddenException("不能查看其他账号的通知");
    }
    if (
      parsed.company_id !== undefined &&
      parsed.company_id !== companyId
    ) {
      throw new ForbiddenException("不能查看其他企业的通知");
    }
    if (parsed.audience !== undefined && parsed.audience !== actor.audience) {
      throw new ForbiddenException("不能查看其他受众的通知");
    }

    return IdentityNotificationListResponseSchema.parse(
      await this.stateStore.listNotifications({
        recipient_user_id: actor.user_id,
        company_id: companyId,
        audience: actor.audience,
        status: parsed.status,
        page: parsed.page,
        page_size: parsed.page_size,
      }),
    );
  }

  async listAdminNotifications(query: unknown) {
    this.authorization.requireStaffPermission("notifications:read");
    const parsed = parseInput(IdentityNotificationListQuerySchema, query);
    return IdentityNotificationListResponseSchema.parse(
      await this.stateStore.listNotifications(parsed),
    );
  }

  async listRoles() {
    this.authorization.requireStaffPermission("identity:read");
    return IdentityRoleListResponseSchema.parse(
      listResponse(await this.stateStore.listRoles()),
    );
  }

  async updatePermissions(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("identity:write");
    const parsedId = parseInput(UserIdParamSchema, { id });
    const parsedBody = parseInput(IdentityPermissionUpdateSchema, body);
    const context = this.requestContext.requireContext();
    const item = await this.stateStore.setUserPermissions(
      parsedId.id,
      parsedBody.permissions,
    );

    await this.platformState.recordAudit({
      actor_id: context.actor?.user_id ?? 1,
      action: "identity.permission.update",
      entity: "user_permission",
      entity_id: parsedId.id,
      before: null,
      after: {
        user_id: parsedId.id,
        permissions: parsedBody.permissions,
        reason: parsedBody.reason ?? null,
      },
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return IdentityRoleMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}

