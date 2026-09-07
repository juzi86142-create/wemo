import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
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
import type { IdentityNotificationListQuery } from "@wemo/contracts/identity";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { listResponse } from "../../runtime/list-response";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";
import { IdentityPrismaRepository } from "./identity.prisma-repository";
import { IDENTITY_REPOSITORY } from "./identity.repository";

const UserIdParamSchema = z.object({
  id: EntityIdSchema,
});

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

  async getProfile() {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const user = await this.repository.getUserById(actor.user_id);
    if (!user) {
      throw new NotFoundException("用户不存在");
    }
    const [addresses, subscriptions, dealerContext] = await Promise.all([
      this.repository.listAddresses(actor.user_id),
      this.repository.listSubscriptions(actor.user_id),
      this.repository.getDealerContextForUser(actor.user_id),
    ]);

    const item = {
      user,
      permissions: actor.permissions,
      addresses,
      subscriptions,
      dealer_context: dealerContext,
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
    const item = await this.repository.updateProfile(actor.user_id, input);

    return IdentityUserMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listAddresses() {
    const actor = this.authorization.requireActor();
    return IdentityAddressListResponseSchema.parse(
      listResponse(await this.repository.listAddresses(actor.user_id)),
    );
  }

  async createAddress(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(IdentityAddressCreateSchema, body);
    const item = await this.repository.createAddress(actor.user_id, input);

    return IdentityAddressMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listSubscriptions() {
    const actor = this.authorization.requireActor();
    return IdentitySubscriptionListResponseSchema.parse(
      listResponse(await this.repository.listSubscriptions(actor.user_id)),
    );
  }

  async upsertSubscription(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(IdentitySubscriptionUpsertSchema, body);
    const item = await this.repository.upsertSubscription(actor.user_id, input);

    return IdentitySubscriptionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listDataRequests() {
    const actor = this.authorization.requireActor();
    return IdentityDataRequestListResponseSchema.parse(
      listResponse(await this.repository.listDataRequests(actor.user_id)),
    );
  }

  async createDataRequest(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(IdentityDataRequestCreateSchema, body);
    const item = await this.repository.createDataRequest(actor.user_id, {
      kind: input.kind,
      request_id: context.request_id,
      notes: input.notes ?? null,
    });

    return IdentityDataRequestMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listNotifications(query: unknown) {
    const actor = this.authorization.requireActor();
    const parsed = parseInput(IdentityNotificationListQuerySchema, query);
    const repoQuery: IdentityNotificationListQuery = {
      page: parsed.page,
      page_size: parsed.page_size,
      recipient_user_id: actor.user_id,
      audience: actor.audience,
      ...(parsed.status !== undefined ? { status: parsed.status } : {}),
    };

    return IdentityNotificationListResponseSchema.parse(
      await this.repository.listNotifications(repoQuery),
    );
  }

  async listAdminNotifications(query: unknown) {
    this.authorization.requireStaffPermission("notifications:read");
    const parsed = parseInput(IdentityNotificationListQuerySchema, query);

    return IdentityNotificationListResponseSchema.parse(
      await this.repository.listNotifications(parsed),
    );
  }

  async listRoles() {
    this.authorization.requireStaffPermission("identity:read");
    return IdentityRoleListResponseSchema.parse(
      listResponse(await this.repository.listRoles()),
    );
  }

  async updatePermissions(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("identity:write");
    const parsedId = parseInput(UserIdParamSchema, { id });
    const parsedBody = parseInput(IdentityPermissionUpdateSchema, body);
    const context = this.requestContext.requireContext();
    const item = await this.repository.setUserPermissions(
      parsedId.id,
      parsedBody.permissions,
    );

    return IdentityRoleMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
