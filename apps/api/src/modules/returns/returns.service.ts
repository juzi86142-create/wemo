import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ReturnCreateSchema,
  ReturnListQuerySchema,
  ReturnListResponseSchema,
  ReturnMutationResponseSchema,
  ReturnReviewSchema,
} from "@wemo/contracts/commerce";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  ORDERS_REPOSITORY,
  type OrdersRepository,
} from "../orders/orders.repository";
import { ReturnsPrismaRepository } from "./returns.prisma-repository";
import { RETURNS_REPOSITORY } from "./returns.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const ReturnIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class ReturnsService {
  constructor(
    @Inject(RETURNS_REPOSITORY)
    private readonly repository: ReturnsPrismaRepository,
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: OrdersRepository,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listReturns(query: unknown) {
    const actor = this.authorization.requireActor();
    const parsed = parseInput(ReturnListQuerySchema, query);
    const scope = {
      ...parsed,
      ...(actor.audience === "dealer" && actor.company_id
        ? { company_id: actor.company_id }
        : {}),
      ...(actor.audience !== "staff" && actor.audience !== "dealer"
        ? { user_id: actor.user_id }
        : {}),
    };
    return ReturnListResponseSchema.parse(
      await this.repository.listReturns(scope),
    );
  }

  async createReturn(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(ReturnCreateSchema, body);
    const actor = this.authorization.requireActor();
    // 售后按订单行项目发起 必须校验订单存在归属与可售后状态
    const order = await this.ordersRepository.getOrderById(input.order_id);
    if (!order) {
      throw new NotFoundException("订单不存在");
    }
    if (actor.audience !== "staff") {
      const belongsToUser = order.user_id !== null && order.user_id === actor.user_id;
      const belongsToCompany =
        order.company_id !== null &&
        actor.company_id !== undefined &&
        order.company_id === actor.company_id;
      if (!belongsToUser && !belongsToCompany) {
        throw new ForbiddenException("不能对其他订单发起售后");
      }
    }
    const refundable = new Set([
      "paid",
      "processing",
      "partially_shipped",
      "shipped",
      "completed",
    ]);
    if (!refundable.has(order.status)) {
      throw new ForbiddenException("当前订单状态不支持售后");
    }
    // 售后行项必须属于该订单且数量不超过订购量 需求 USR-007
    const orderItems = await this.ordersRepository.getOrderItems(input.order_id);
    for (const line of input.items) {
      const orderItem = orderItems.find((row) => row.id === line.order_item_id);
      if (!orderItem) {
        throw new ForbiddenException(
          `订单行 ${line.order_item_id} 不属于该订单`,
        );
      }
      if (line.quantity > orderItem.quantity) {
        throw new ForbiddenException(
          `订单行 ${line.order_item_id} 退货数量超过订购量`,
        );
      }
    }
    const item = await this.repository.createReturn({
      ...input,
      user_id: actor.audience === "staff" ? null : actor.user_id,
      company_id: actor.company_id ?? null,
      request_id: context.request_id,
    });

    await this.notifications.emitBusinessNotification({
      template_code: "return_requested",
      recipient_user_id: item.user_id,
      company_id: item.company_id,
      audience: item.company_id ? "dealer" : "user",
      channel: "email",
      request_id: context.request_id,
      payload: { return_id: item.id, status: item.status },
    });

    return ReturnMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async reviewReturn(id: unknown, body: unknown) {
    const context = this.requestContext.requireContext();
    const actor = this.authorization.requireStaffPermission("returns:write");
    const parsedId = parseInput(ReturnIdParamSchema, { id });
    const input = parseInput(ReturnReviewSchema, body);
    const item = await this.repository.reviewReturn(
      parsedId.id,
      context.request_id,
      input.decision,
      actor.user_id,
      input.note,
    );

    return ReturnMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
