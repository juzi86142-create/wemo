import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  FormSubmission,
  FormSubmissionCreateInput,
  FormSubmissionListQuery,
  FormSubmissionUpdateInput,
  JsonValue,
} from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

import { DATABASE_CLIENT } from "../../database/database.constants";
import type {
  FormDefinition,
  FormDefinitionCreateInput,
  FormDefinitionListQuery,
  FormDefinitionUpdateInput,
  FormPage,
  FormsRepository,
} from "./forms.repository";

// Prisma schema 尚未包含 form_submissions 模型（生成 client 无该 delegate），
// 此处按表结构声明最小访问面；schema 恢复并重新 generate 后可换回 database.formSubmission 直调。
type FormSubmissionRow = {
  id: number;
  submissionNo: string;
  type: string;
  source: string;
  payload: unknown;
  assigneeId: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type FormSubmissionDelegate = {
  create(args: {
    data: {
      submissionNo: string;
      type: string;
      source: string;
      payload: unknown;
      assigneeId: number | null;
      status: string;
    };
  }): Promise<FormSubmissionRow>;
  findMany(args: {
    where: unknown;
    skip: number;
    take: number;
    orderBy: unknown;
  }): Promise<FormSubmissionRow[]>;
  count(args: { where: unknown }): Promise<number>;
  findUnique(args: { where: { id: number } }): Promise<FormSubmissionRow | null>;
  update(args: { where: { id: number }; data: unknown }): Promise<FormSubmissionRow>;
};

@Injectable()
export class FormsPrismaRepository implements FormsRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
  ) {}

  private get submissions(): FormSubmissionDelegate {
    return (
      this.database as unknown as { formSubmission: FormSubmissionDelegate }
    ).formSubmission;
  }

  async createForm(input: FormDefinitionCreateInput): Promise<FormDefinition> {
    void input;
    throw new Error("Demo模式：暂不支持表单定义管理");
  }

  async getFormById(id: number): Promise<FormDefinition | null> {
    void id;
    throw new Error("Demo模式：暂不支持表单定义管理");
  }

  async listForms(query: FormDefinitionListQuery): Promise<FormPage<FormDefinition>> {
    void query;
    throw new Error("Demo模式：暂不支持表单定义管理");
  }

  async updateForm(
    id: number,
    input: FormDefinitionUpdateInput,
  ): Promise<FormDefinition> {
    void id;
    void input;
    throw new Error("Demo模式：暂不支持表单定义管理");
  }

  async submitForm(input: FormSubmissionCreateInput): Promise<FormSubmission> {
    const row = await this.submissions.create({
      data: {
        submissionNo: this.buildSubmissionNo(),
        type: input.type,
        source: input.source,
        payload: input.payload,
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
    const existing = await this.submissions.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("提交记录不存在");
    }

    // priority/tags/internal_note 无对应列，demo 阶段仅落库状态与负责人
    const data: Record<string, unknown> = {};
    if (input.assignee_id !== undefined) data.assigneeId = input.assignee_id;
    if (input.status !== undefined) data.status = input.status;

    const row = await this.submissions.update({ where: { id }, data });
    return this.mapSubmission(row);
  }

  async listSubmissions(
    query: FormSubmissionListQuery,
  ): Promise<FormPage<FormSubmission>> {
    const where: Record<string, unknown> = {};
    if (query.type !== undefined) where.type = query.type;
    if (query.status !== undefined) where.status = query.status;
    if (query.assignee_id !== undefined) where.assigneeId = query.assignee_id;

    const [rows, total] = await Promise.all([
      this.submissions.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.submissions.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.mapSubmission(row)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getSubmissionById(id: number): Promise<FormSubmission | null> {
    const row = await this.submissions.findUnique({ where: { id } });
    return row ? this.mapSubmission(row) : null;
  }

  private buildSubmissionNo(): string {
    const stamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `FS-${stamp}-${random}`;
  }

  // attachments/priority/tags/internal_note/request_id/history 无对应列，
  // 返回契约形状时补齐稳定默认值（request_id 以 submission_no 回退）
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
