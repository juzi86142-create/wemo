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
import { PlatformStateStore } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";
import { IdentityStateStore } from "./identity.state";

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
    @Inject(IdentityStateStore)
    private readonly stateStore: IdentityStateStore,
    @Inject(PlatformStateStore)
    private readonly platformState: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  getProfile() {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const item = {
      user: this.stateStore.getUserById(actor.user_id),
      permissions: actor.permissions,
      addresses: this.stateStore.listAddresses(actor.user_id),
      subscriptions: this.stateStore.listSubscriptions(actor.user_id),
      dealer_context: this.stateStore.getDealerContextForUser(actor.user_id),
    };

    return IdentityProfileResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  updateProfile(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(IdentityProfileUpdateSchema, body);
    const before = this.stateStore.getUserById(actor.user_id);
    const item = this.stateStore.updateProfile(actor.user_id, input);

    this.platformState.recordAudit({
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

  listAddresses() {
    const actor = this.authorization.requireActor();
    return IdentityAddressListResponseSchema.parse(
      listResponse(this.stateStore.listAddresses(actor.user_id)),
    );
  }

  createAddress(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(IdentityAddressCreateSchema, body);
    const item = this.stateStore.addAddress(actor.user_id, input);

    this.platformState.recordAudit({
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

  listSubscriptions() {
    const actor = this.authorization.requireActor();
    return IdentitySubscriptionListResponseSchema.parse(
      listResponse(this.stateStore.listSubscriptions(actor.user_id)),
    );
  }

  upsertSubscription(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(IdentitySubscriptionUpsertSchema, body);
    const before = this.stateStore.listSubscriptions(actor.user_id).find(
      (entry) => entry.channel === input.channel,
    );
    const item = this.stateStore.upsertSubscription(actor.user_id, input);

    this.platformState.recordAudit({
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

  listDataRequests() {
    const actor = this.authorization.requireActor();
    return IdentityDataRequestListResponseSchema.parse(
      listResponse(this.stateStore.listDataRequests(actor.user_id)),
    );
  }

  createDataRequest(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(IdentityDataRequestCreateSchema, body);
    const item = this.stateStore.createDataRequest(actor.user_id, {
      kind: input.kind,
      request_id: context.request_id,
      notes: input.notes ?? null,
    });

    this.platformState.recordAudit({
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

  listNotifications(query: unknown) {
    const actor = this.authorization.requireActor();
    const parsed = parseInput(IdentityNotificationListQuerySchema, query);
    const dealerContext = this.stateStore.getDealerContextForUser(actor.user_id);
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
      this.stateStore.listNotifications({
        recipient_user_id: actor.user_id,
        company_id: companyId,
        audience: actor.audience,
        status: parsed.status,
        page: parsed.page,
        page_size: parsed.page_size,
      }),
    );
  }

  listAdminNotifications(query: unknown) {
    this.authorization.requireStaffPermission("notifications:read");
    const parsed = parseInput(IdentityNotificationListQuerySchema, query);
    return IdentityNotificationListResponseSchema.parse(
      this.stateStore.listNotifications(parsed),
    );
  }

  listRoles() {
    this.authorization.requireStaffPermission("identity:read");
    return IdentityRoleListResponseSchema.parse(
      listResponse(this.stateStore.listRoles()),
    );
  }

  updatePermissions(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("identity:write");
    const parsedId = parseInput(UserIdParamSchema, { id });
    const parsedBody = parseInput(IdentityPermissionUpdateSchema, body);
    const context = this.requestContext.requireContext();
    const item = this.stateStore.setUserPermissions(
      parsedId.id,
      parsedBody.permissions,
    );

    this.platformState.recordAudit({
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
