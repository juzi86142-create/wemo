import { Inject, Injectable } from "@nestjs/common";
import {
  InventoryBalanceListQuerySchema,
  InventoryBalanceListResponseSchema,
  InventoryReservationActionSchema,
  InventoryReservationCreateSchema,
  InventoryReservationListQuerySchema,
  InventoryReservationListResponseSchema,
  InventoryReservationMutationResponseSchema,
} from "@wemo/contracts/commerce";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { CommerceStateStore } from "../../runtime/commerce.state";
import { PlatformStateStore } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const ReservationIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class InventoryService {
  constructor(
    @Inject(CommerceStateStore)
    private readonly stateStore: CommerceStateStore,
    @Inject(PlatformStateStore)
    private readonly platformState: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listBalances(query: unknown) {
    const parsed = parseInput(InventoryBalanceListQuerySchema, query);
    return InventoryBalanceListResponseSchema.parse(
      this.stateStore.listInventoryBalances(parsed),
    );
  }

  listReservations(query: unknown) {
    this.authorization.requireStaffPermission("inventory:read");
    const parsed = parseInput(InventoryReservationListQuerySchema, query);
    return InventoryReservationListResponseSchema.parse(
      this.stateStore.listInventoryReservations(parsed),
    );
  }

  reserve(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(InventoryReservationCreateSchema, body);
    const item = this.stateStore.reserveInventory(input, context.request_id);
    this.platformState.recordAudit({
      actor_id: context.actor?.user_id ?? 1,
      action: "inventory.reserve",
      entity: "inventory_reservation",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });
    return InventoryReservationMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  confirm(id: unknown, body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ReservationIdParamSchema, { id });
    const input = parseInput(InventoryReservationActionSchema, body);
    const before = this.stateStore.getInventoryReservationById(parsedId.id);
    const item = this.stateStore.confirmInventoryReservation(
      parsedId.id,
      context.request_id,
    );
    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "inventory.confirm",
      entity: "inventory_reservation",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });
    void input;
    return InventoryReservationMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  release(id: unknown, body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ReservationIdParamSchema, { id });
    const input = parseInput(InventoryReservationActionSchema, body);
    const before = this.stateStore.getInventoryReservationById(parsedId.id);
    const item = this.stateStore.releaseInventory(
      parsedId.id,
      context.request_id,
      input.reason,
    );
    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "inventory.release",
      entity: "inventory_reservation",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });
    return InventoryReservationMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
