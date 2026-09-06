import type { ReturnRequest, ReturnRequestCreateInput, ReturnRequestListQuery, ReturnRequestUpdateInput } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const RETURNS_REPOSITORY = Symbol("RETURNS_REPOSITORY");

export interface ReturnsRepository {
  createReturn(input: ReturnRequestCreateInput): Promise<ReturnRequest>;
  getReturnById(id: number): Promise<ReturnRequest | null>;
  listReturns(query: ReturnRequestListQuery): Promise<{ items: ReturnRequest[]; total: number; page: number; page_size: number }>;
  updateReturnStatus(id: number, input: ReturnRequestUpdateInput): Promise<ReturnRequest>;
  approveReturn(id: number, requestId: string, note?: string): Promise<ReturnRequest>;
  rejectReturn(id: number, requestId: string, note?: string): Promise<ReturnRequest>;
}
