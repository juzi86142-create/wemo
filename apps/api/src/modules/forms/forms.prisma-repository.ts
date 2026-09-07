import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Redis } from "ioredis";
import type {
  FormSubmission,
  FormSubmissionCreateInput,
  FormSubmissionListQuery,
  FormSubmissionUpdateInput,
  JsonValue,
} from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

import { DATABASE_CLIENT } from "../../database/database.constants";
import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";
import { generateBusinessNo } from "../../runtime/ids";
import type {
  FormDefinition,
  FormDefinitionCreateInput,
  FormDefinitionListQuery,
  FormDefinitionUpdateInput,
  FormPage,
  FormsRepository,
} from "./forms.repository";

type FormSubmissionRow = NonNullable<
  Awaited<ReturnType<DatabaseClient["formSubmission"]["findFirst"]>>
>;

const FORM_DEFINITIONS_KEY = `${REDIS_KEY_PREFIX}:forms:definitions`;

/** 表单提交持久化在 PostgreSQL 表单定义持久化在 Redis */
@Injectable()
export class FormsPrismaRepository implements FormsRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async createForm(input: FormDefinitionCreateInput): Promise<FormDefinition> {
    const now = new Date().toISOString();
    const form: FormDefinition = {
      id: await this.redis.incr(`${REDIS_KEY_PREFIX}:forms:definitions:next`),
      name: input.name,
      description: input.description ?? null,
      fields: input.fields ?? [],
      is_active: input.is_active ?? true,
      created_at: now,
      updated_at: now,
    };
    await this.redis.hset(
      FORM_DEFINITIONS_KEY,
      String(form.id),
      JSON.stringify(form),
    );
    return form;
  }

  async getFormById(id: number): Promise<FormDefinition | null> {
    const raw = await this.redis.hget(FORM_DEFINITIONS_KEY, String(id));
    return raw ? (JSON.parse(raw) as FormDefinition) : null;
  }

  async listForms(
    query: FormDefinitionListQuery,
  ): Promise<FormPage<FormDefinition>> {
    const raw = await this.redis.hgetall(FORM_DEFINITIONS_KEY);
    const forms = Object.entries(raw)
      .map(([, value]) => JSON.parse(value) as FormDefinition)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const start = (query.page - 1) * query.page_size;
    return {
      items: forms.slice(start, start + query.page_size),
      total: forms.length,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async updateForm(
    id: number,
    input: FormDefinitionUpdateInput,
  ): Promise<FormDefinition> {
    const existing = await this.getFormById(id);
    if (!existing) {
      throw new NotFoundException(`表单定义 ${id} 不存在`);
    }
    const updated: FormDefinition = {
      ...existing,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.fields !== undefined ? { fields: input.fields } : {}),
      ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
      updated_at: new Date().toISOString(),
    };
    await this.redis.hset(
      FORM_DEFINITIONS_KEY,
      String(id),
      JSON.stringify(updated),
    );
    return updated;
  }

  async submitForm(input: FormSubmissionCreateInput): Promise<FormSubmission> {
    const row = await this.database.formSubmission.create({
      data: {
        submissionNo: generateBusinessNo("FS"),
        type: input.type,
        source: input.source,
        payload: input.payload as never,
        assigneeId: null,
        status: "new",
      },
    });

    return this.mapSubmission(row);
  }

  async updateSubmission(
    id: number,
    input: FormSubmissionUpdateInput,
  ): Promise<FormSubmission> {
    const existing = await this.database.formSubmission.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException("提交记录不存在");
    }

    const data: Record<string, unknown> = {};
    if (input.assignee_id !== undefined) data.assigneeId = input.assignee_id;
    if (input.status !== undefined) data.status = input.status;

    const row = await this.database.formSubmission.update({
      where: { id },
      data,
    });
    return this.mapSubmission(row);
  }

  async listSubmissions(
    query: FormSubmissionListQuery,
  ): Promise<FormPage<FormSubmission>> {
    const where = {
      ...(query.type !== undefined ? { type: query.type } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.assignee_id !== undefined
        ? { assigneeId: query.assignee_id }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.database.formSubmission.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.formSubmission.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.mapSubmission(row)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getSubmissionById(id: number): Promise<FormSubmission | null> {
    const row = await this.database.formSubmission.findUnique({
      where: { id },
    });
    return row ? this.mapSubmission(row) : null;
  }

  private mapSubmission(row: FormSubmissionRow): FormSubmission {
    return {
      id: row.id,
      submission_no: row.submissionNo,
      type: row.type,
      source: row.source,
      payload: row.payload as JsonValue,
      attachments: [],
      assignee_id: row.assigneeId,
      priority: "normal",
      tags: [],
      internal_note: null,
      status: row.status,
      request_id: row.submissionNo,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
      history: [],
    };
  }
}
