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
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";
import { IdentityPrismaRepository } from "./identity.prisma-repository";
import { IDENTITY_REPOSITORY } from "./identity.repository";

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
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  getProfile() {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const item = {
      user: this.repository.getUserById(actor.user_id),
      permissions: actor.permissions,
      addresses: this.repository.listAddresses(actor.user_id),
      subscriptions: this.repository.listSubscriptions(actor.user_id),
      dealer_context: null,
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
    const item = this.repository.updateProfile(actor.user_id, input);

    return IdentityUserMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listAddresses() {
    const actor = this.authorization.requireActor();
    return IdentityAddressListResponseSchema.parse(
      listResponse(this.repository.listAddresses(actor.user_id)),
    );
  }

  createAddress(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(IdentityAddressCreateSchema, body);
    const item = this.repository.createAddress(actor.user_id, input);

    return IdentityAddressMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listSubscriptions() {
    const actor = this.authorization.requireActor();
    return IdentitySubscriptionListResponseSchema.parse(
      listResponse(this.repository.listSubscriptions(actor.user_id)),
    );
  }

  upsertSubscription(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(IdentitySubscriptionUpsertSchema, body);
    const item = this.repository.upsertSubscription(actor.user_id, input);

    return IdentitySubscriptionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listDataRequests() {
    const actor = this.authorization.requireActor();
    return IdentityDataRequestListResponseSchema.parse(
      listResponse(this.repository.listDataRequests(actor.user_id)),
    );
  }

  createDataRequest(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(IdentityDataRequestCreateSchema, body);
    const item = this.repository.createDataRequest(actor.user_id, {
      kind: input.kind,
      request_id: context.request_id,
      notes: input.notes ?? null,
    });

    return IdentityDataRequestMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listNotifications(query: unknown) {
    const actor = this.authorization.requireActor();
    const parsed = parseInput(IdentityNotificationListQuerySchema, query);
    return IdentityNotificationListResponseSchema.parse(
      this.repository.listNotifications({
        recipient_user_id: actor.user_id,
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
      this.repository.listNotifications(parsed),
    );
  }

  listRoles() {
    this.authorization.requireStaffPermission("identity:read");
    return IdentityRoleListResponseSchema.parse(
      listResponse(this.repository.listRoles()),
    );
  }

  updatePermissions(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("identity:write");
    const parsedId = parseInput(UserIdParamSchema, { id });
    const parsedBody = parseInput(IdentityPermissionUpdateSchema, body);
    const context = this.requestContext.requireContext();
    const item = this.repository.setUserPermissions(
      parsedId.id,
      parsedBody.permissions,
    );

    return IdentityRoleMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
