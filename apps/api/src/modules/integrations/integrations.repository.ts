import type { IntegrationAdapter, WebhookDelivery } from "@wemo/contracts";

export const INTEGRATIONS_REPOSITORY = Symbol("INTEGRATIONS_REPOSITORY");

export type IntegrationTestResult = {
  success: boolean;
  message: string;
  response_time_ms: number;
};

export interface IntegrationsRepository {
  createIntegration(input: unknown): Promise<IntegrationAdapter>;
  getIntegrationById(id: number): Promise<IntegrationAdapter | null>;
  listIntegrations(query: {
    page: number;
    page_size: number;
  }): Promise<{
    items: IntegrationAdapter[];
    total: number;
    page: number;
    page_size: number;
  }>;
  updateIntegration(id: number, input: unknown): Promise<IntegrationAdapter>;
  testConnection(id: number): Promise<IntegrationTestResult>;
  /** 持久化一条 Webhook 投递记录 */
  recordWebhookDelivery(input: {
    integration_id: number;
    provider: string;
    event: string;
    status: WebhookDelivery["status"];
    idempotency_key: string;
    request_id: string;
    attempt_count: number;
    failure_reason: string | null;
    payload: unknown;
    response: unknown;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
  }): Promise<WebhookDelivery>;
  /** 分页查询 Webhook 投递记录 */
  listWebhookDeliveries(query: {
    page: number;
    page_size: number;
    provider?: string | undefined;
  }): Promise<{
    items: WebhookDelivery[];
    total: number;
    page: number;
    page_size: number;
  }>;
}
