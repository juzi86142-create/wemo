import type {
  ReturnCreateInput,
  ReturnListQuery,
  ReturnRequest,
  ReturnStatus,
} from "@wemo/contracts";

export const RETURNS_REPOSITORY = Symbol("RETURNS_REPOSITORY");

/** createReturn 的仓储入参：契约字段 + 服务端推导的上下文字段。 */
export interface ReturnCreateRecord extends ReturnCreateInput {
  user_id: number | null;
  company_id: number | null;
  request_id: string;
}

export interface ReturnsRepository {
  createReturn(input: ReturnCreateRecord): Promise<ReturnRequest>;
  getReturnById(id: number): Promise<ReturnRequest | null>;
  listReturns(query: ReturnListQuery): Promise<{
    items: ReturnRequest[];
    total: number;
    page: number;
    page_size: number;
  }>;
  reviewReturn(
    id: number,
    requestId: string,
    decision: ReturnStatus,
    actorId: number | null,
    note?: string,
  ): Promise<ReturnRequest>;
}
