import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { FORMS_REPOSITORY, type FormsRepository } from "./forms.repository";
import type { Form, FormSubmission } from "@wemo/contracts";

@Injectable()
export class FormsPrismaRepository implements FormsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async createForm(input: any): Promise<Form> {
    const form = await this.database.form.create({
      data: {
        name: input.name,
        description: input.description,
        fields: input.fields || [],
        isActive: input.is_active ?? true,
      },
    });

    return this.mapForm(form);
  }

  async getFormById(id: number): Promise<Form | null> {
    const form = await this.database.form.findUnique({
      where: { id },
    });

    return form ? this.mapForm(form) : null;
  }

  async listForms(query: any): Promise<{ items: Form[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.is_active !== undefined) where.isActive = query.is_active;

    const [forms, total] = await Promise.all([
      this.database.form.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.form.count({ where }),
    ]);

    return {
      items: forms.map(f => this.mapForm(f)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async updateForm(id: number, input: any): Promise<Form> {
    const form = await this.database.form.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        fields: input.fields,
        isActive: input.is_active,
      },
    });

    return this.mapForm(form);
  }

  async submitForm(input: any): Promise<FormSubmission> {
    const submission = await this.database.formSubmission.create({
      data: {
        formId: input.form_id,
        data: input.data || {},
        ip: input.ip,
        userAgent: input.user_agent,
      },
    });

    return this.mapSubmission(submission);
  }

  async listSubmissions(query: any): Promise<{ items: FormSubmission[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.form_id) where.formId = query.form_id;

    const [submissions, total] = await Promise.all([
      this.database.formSubmission.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.formSubmission.count({ where }),
    ]);

    return {
      items: submissions.map(s => this.mapSubmission(s)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getSubmissionById(id: number): Promise<FormSubmission | null> {
    const submission = await this.database.formSubmission.findUnique({
      where: { id },
    });

    return submission ? this.mapSubmission(submission) : null;
  }

  private mapForm(form: any): Form {
    return {
      id: form.id,
      name: form.name,
      description: form.description,
      fields: form.fields || [],
      is_active: form.isActive,
      created_at: form.createdAt.toISOString(),
      updated_at: form.updatedAt.toISOString(),
    };
  }

  private mapSubmission(submission: any): FormSubmission {
    return {
      id: submission.id,
      form_id: submission.formId,
      data: submission.data || {},
      ip: submission.ip,
      user_agent: submission.userAgent,
      created_at: submission.createdAt.toISOString(),
    };
  }
}
