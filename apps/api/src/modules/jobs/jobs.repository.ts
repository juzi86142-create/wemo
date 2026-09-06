import type { JobDefinition, JobExecution } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const JOBS_REPOSITORY = Symbol("JOBS_REPOSITORY");

export interface JobsRepository {
  listDefinitions(): Promise<JobDefinition[]>;
  getDefinition(id: number): Promise<JobDefinition | null>;
  createDefinition(input: any): Promise<JobDefinition>;
  triggerExecution(jobId: number): Promise<JobExecution>;
  listExecutions(query: any): Promise<{ items: JobExecution[]; total: number; page: number; page_size: number }>;
  updateExecutionStatus(executionId: number, status: string, output?: any): Promise<JobExecution>;
}
