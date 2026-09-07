import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  InventoryBalanceListQuerySchema,
  InventoryBalanceListResponseSchema,
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

  async listBalances(query: unknown) {
    this.authorization.requireStaffPermission("inventory:read");
    const parsed = parseInput(InventoryBalanceListQuerySchema, query);
    const list = await this.repository.listBalances(parsed);
    return InventoryBalanceListResponseSchema.parse(list);
  }

  async listReservations(query: unknown) {
    this.authorization.requireStaffPermission("inventory:read");
    const parsed = parseInput(InventoryReservationListQuerySchema, query);
    const list = await this.repository.listReservations(parsed);
    return InventoryReservationListResponseSchema.parse(list);
  }

  async reserve(body: unknown) {
    this.authorization.requireStaffPermission("inventory:read");
    const context = this.requestContext.requireContext();
    const input = parseInput(InventoryReservationCreateSchema, body);
    const item = await this.repository.createReservation(input);
    return InventoryReservationMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async confirm(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("inventory:read");
    void body;
    const parsedId = parseInput(ReservationIdParamSchema, { id });
    const item = await this.repository.confirmReservation(parsedId.id);
    if (!item) {
      throw new NotFoundException("预占不存在或已处理");
    }
    return InventoryReservationMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item,
    });
  }

  release(id: unknown, body: unknown) {
    const parsedId = parseInput(ReservationIdParamSchema, { id });
    void body;
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
