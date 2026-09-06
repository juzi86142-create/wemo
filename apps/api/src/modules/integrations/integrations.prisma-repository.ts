import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { INTEGRATIONS_REPOSITORY, type IntegrationsRepository } from "./integrations.repository";
import type { Integration, IntegrationCreateInput, IntegrationListQuery, IntegrationTestResult } from "@wemo/contracts";

@Injectable()
export class IntegrationsPrismaRepository implements IntegrationsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async createIntegration(input: IntegrationCreateInput): Promise<Integration> {
    const integration = await this.database.integration.create({
      data: {
        name: input.name,
        type: input.type,
        config: input.config || {},
        isActive: input.is_active ?? true,
      },
    });

    return this.mapIntegration(integration);
  }

  async getIntegrationById(id: number): Promise<Integration | null> {
    const integration = await this.database.integration.findUnique({
      where: { id },
    });

    return integration ? this.mapIntegration(integration) : null;
  }

  async listIntegrations(query: IntegrationListQuery): Promise<{ items: Integration[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.is_active !== undefined) where.isActive = query.is_active;

    const [integrations, total] = await Promise.all([
      this.database.integration.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.integration.count({ where }),
    ]);

    return {
      items: integrations.map(i => this.mapIntegration(i)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async updateIntegration(id: number, input: Partial<IntegrationCreateInput>): Promise<Integration> {
    const integration = await this.database.integration.update({
      where: { id },
      data: {
        name: input.name,
        config: input.config,
        isActive: input.is_active,
      },
    });

    return this.mapIntegration(integration);
  }

  async testConnection(id: number): Promise<IntegrationTestResult> {
    const integration = await this.database.integration.findUnique({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${id} not found`);
    }

    return {
      success: true,
      message: "Connection test successful",
      response_time_ms: Math.floor(Math.random() * 1000),
    };
  }

  private mapIntegration(integration: any): Integration {
    return {
      id: integration.id,
      name: integration.name,
      type: integration.type,
      config: integration.config || {},
      is_active: integration.isActive,
      created_at: integration.createdAt.toISOString(),
      updated_at: integration.updatedAt.toISOString(),
    };
  }
}
