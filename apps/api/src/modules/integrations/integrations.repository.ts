import type { Integration, IntegrationCreateInput, IntegrationListQuery, IntegrationTestResult } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const INTEGRATIONS_REPOSITORY = Symbol("INTEGRATIONS_REPOSITORY");

export interface IntegrationsRepository {
  createIntegration(input: IntegrationCreateInput): Promise<Integration>;
  getIntegrationById(id: number): Promise<Integration | null>;
  listIntegrations(query: IntegrationListQuery): Promise<{ items: Integration[]; total: number; page: number; page_size: number }>;
  updateIntegration(id: number, input: Partial<IntegrationCreateInput>): Promise<Integration>;
  testConnection(id: number): Promise<IntegrationTestResult>;
}
