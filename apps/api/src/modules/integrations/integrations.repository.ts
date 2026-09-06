import type { IntegrationAdapter } from "@wemo/contracts";

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
}
