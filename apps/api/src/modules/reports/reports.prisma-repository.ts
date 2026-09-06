import { Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { REPORTS_REPOSITORY, type ReportsRepository } from "./reports.repository";
import type { ReportDefinition, ReportResult } from "@wemo/contracts";

@Injectable()
export class ReportsPrismaRepository implements ReportsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listDefinitions(query: any): Promise<{ items: ReportDefinition[]; total: number; page: number; page_size: number }> {
    const [definitions, total] = await Promise.all([
      this.database.reportDefinition.findMany({
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.reportDefinition.count(),
    ]);

    return {
      items: definitions.map(d => this.mapDefinition(d)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getDefinition(id: number): Promise<ReportDefinition | null> {
    const definition = await this.database.reportDefinition.findUnique({
      where: { id },
    });

    return definition ? this.mapDefinition(definition) : null;
  }

  async runReport(id: number, params?: Record<string, any>): Promise<ReportResult> {
    const definition = await this.database.reportDefinition.findUnique({
      where: { id },
    });

    if (!definition) {
      throw new Error(`Report ${id} not found`);
    }

    return {
      id: `report-${id}-${Date.now()}`,
      definition_id: id,
      params: params || {},
      status: "completed",
      result: {},
      generated_at: new Date().toISOString(),
    };
  }

  async saveResult(result: any): Promise<{ id: number }> {
    const saved = await this.database.reportResult.create({
      data: {
        definitionId: result.definition_id,
        params: result.params || {},
        data: result.data || {},
        generatedBy: result.generated_by,
        format: result.format || "json",
      },
    });

    return { id: saved.id };
  }

  private mapDefinition(definition: any): ReportDefinition {
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      params: definition.params || [],
      status: definition.status,
      created_at: definition.createdAt.toISOString(),
      updated_at: definition.updatedAt.toISOString(),
    };
  }
}
