import { z } from "zod";
import {
  JobListQuerySchema,
  type JobRun,
  type JobStatus,
} from "@wemo/contracts/platform";

export const JOBS_REPOSITORY = Symbol("JOBS_REPOSITORY");

export type JobListQuery = z.infer<typeof JobListQuerySchema>;

export type JobExecutionPage = {
  items: JobRun[];
  total: number;
  page: number;
  page_size: number;
};

export interface JobsRepository {
  listDefinitions(): Promise<JobRun[]>;
  getDefinition(id: number): Promise<JobRun | null>;
  createDefinition(input: unknown): Promise<JobRun>;
  triggerExecution(jobId: number): Promise<JobRun>;
  listExecutions(query: JobListQuery): Promise<JobExecutionPage>;
  updateExecutionStatus(
    executionId: number,
    status: JobStatus,
    output?: unknown,
  ): Promise<JobRun>;
}
