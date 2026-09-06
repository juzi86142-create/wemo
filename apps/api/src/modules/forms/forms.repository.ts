import type { Form, FormCreateInput, FormSubmission, FormSubmissionCreateInput, FormSubmissionListQuery, FormUpdateInput } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const FORMS_REPOSITORY = Symbol("FORMS_REPOSITORY");

export interface FormsRepository {
  createForm(input: FormCreateInput): Promise<Form>;
  getFormById(id: number): Promise<Form | null>;
  listForms(query: any): Promise<{ items: Form[]; total: number; page: number; page_size: number }>;
  updateForm(id: number, input: FormUpdateInput): Promise<Form>;
  submitForm(input: FormSubmissionCreateInput): Promise<FormSubmission>;
  listSubmissions(query: FormSubmissionListQuery): Promise<{ items: FormSubmission[]; total: number; page: number; page_size: number }>;
  getSubmissionById(id: number): Promise<FormSubmission | null>;
}
