import { Inject, Injectable } from "@nestjs/common";
import type { IntegrationAdapter } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";
import { DATABASE_CLIENT } from "../../database/database.constants";

import {
  type IntegrationTestResult,
  type IntegrationsRepository,
} from "./integrations.repository";

const DEMO_INTEGRATION_NOT_SUPPORTED = "Demo模式：暂不支持集成配置持久化";

/**
 * Demo 模式：integrations 表已从数据库中移除，
 * 列表返回空分页，其余配置类操作一律抛错。
 */
@Injectable()
export class IntegrationsPrismaRepository implements IntegrationsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async createIntegration(input: unknown): Promise<IntegrationAdapter> {
    throw new Error(DEMO_INTEGRATION_NOT_SUPPORTED);
  }

  async getIntegrationById(id: number): Promise<IntegrationAdapter | null> {
    return null;
  }

  async listIntegrations(query: {
    page: number;
    page_size: number;
  }): Promise<{
    items: IntegrationAdapter[];
    total: number;
    page: number;
    page_size: number;
  }> {
    return { items: [], total: 0, page: query.page, page_size: query.page_size };
  }

  async updateIntegration(id: number, input: unknown): Promise<IntegrationAdapter> {
    throw new Error(DEMO_INTEGRATION_NOT_SUPPORTED);
  }

  async testConnection(id: number): Promise<IntegrationTestResult> {
    throw new Error(DEMO_INTEGRATION_NOT_SUPPORTED);
  }
}
