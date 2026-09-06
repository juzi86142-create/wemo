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
import { InventoryPrismaRepository } from "./inventory.prisma-repository";
import { INVENTORY_REPOSITORY } from "./inventory.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const ReservationIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class InventoryService {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listBalances(query: unknown) {
    const parsed = parseInput(InventoryBalanceListQuerySchema, query);
    return InventoryBalanceListResponseSchema.parse(
      this.repository.listBalances(parsed),
    );
  }

  listReservations(query: unknown) {
    this.authorization.requireStaffPermission("inventory:read");
    const parsed = parseInput(InventoryReservationListQuerySchema, query);
    return InventoryReservationListResponseSchema.parse(
      this.repository.listReservations(parsed),
    );
  }

  reserve(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(InventoryReservationCreateSchema, body);
    const item = this.repository.createReservation(input);
    return InventoryReservationMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  confirm(id: unknown, body: unknown) {
    const parsedId = parseInput(ReservationIdParamSchema, { id });
    void body;
    return InventoryReservationMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: {
        id: parsedId.id,
        status: "active",
      },
    });
  }

  release(id: unknown, body: unknown) {
    const parsedId = parseInput(ReservationIdParamSchema, { id });
    this.repository.releaseReservation(parsedId.id);
    return InventoryReservationMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: {
        id: parsedId.id,
        status: "released",
      },
    });
  }
}
