import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  ApiErrorSchema,
  createPaginatedResponseSchema,
  EntityIdSchema,
  PaginationSchema,
} from "./index.js";

describe("通用 API 契约", () => {
  it("解析正整数实体 ID 和带默认值的分页参数", () => {
    expect(EntityIdSchema.parse("12")).toBe(12);
    expect(PaginationSchema.parse({})).toEqual({ page: 1, page_size: 20 });
    expect(PaginationSchema.parse({ page: "2", page_size: "50" })).toEqual({
      page: 2,
      page_size: 50,
    });
  });

  it("拒绝越界分页和非正整数 ID", () => {
    expect(EntityIdSchema.safeParse(0).success).toBe(false);
    expect(
      PaginationSchema.safeParse({ page: 1, page_size: 101 }).success,
    ).toBe(false);
  });

  it("固定统一错误结构并拒绝意外字段", () => {
    const error = {
      code: "VALIDATION_ERROR",
      message: "请求参数无效",
      field_errors: [{ field: "page", message: "必须大于等于 1" }],
      request_id: "req-1",
    };

    expect(ApiErrorSchema.parse(error)).toEqual(error);
    expect(
      ApiErrorSchema.safeParse({ ...error, debug: "secret" }).success,
    ).toBe(false);
  });

  it("生成统一列表响应契约", () => {
    const schema = createPaginatedResponseSchema(
      z.object({ id: z.number().int().positive() }).strict(),
    );

    expect(
      schema.parse({ items: [{ id: 1 }], page: 1, page_size: 20, total: 1 }),
    ).toEqual({ items: [{ id: 1 }], page: 1, page_size: 20, total: 1 });
  });
});
