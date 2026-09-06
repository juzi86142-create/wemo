import type {
  FormSubmission,
  FormSubmissionCreateInput,
  FormSubmissionListQuery,
  FormSubmissionUpdateInput,
} from "@wemo/contracts";

export const FORMS_REPOSITORY = Symbol("FORMS_REPOSITORY");

// === 表单定义（Demo 模式不落库，仅保留接口形态） ===
export type FormDefinition = {
  id: number;
  name: string;
  description: string | null;
  fields: unknown[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FormDefinitionCreateInput = {
  name: string;
  description?: string;
  fields?: unknown[];
  is_active?: boolean;
};

export type FormDefinitionUpdateInput = {
  name?: string;
  description?: string | null;
  fields?: unknown[];
  is_active?: boolean;
};

export type FormDefinitionListQuery = {
  page: number;
  page_size: number;
};

export type FormPage<Item> = {
  items: Item[];
  total: number;
  page: number;
  page_size: number;
};

export interface FormsRepository {
  createForm(input: FormDefinitionCreateInput): Promise<FormDefinition>;
  getFormById(id: number): Promise<FormDefinition | null>;
  listForms(query: FormDefinitionListQuery): Promise<FormPage<FormDefinition>>;
  updateForm(id: number, input: FormDefinitionUpdateInput): Promise<FormDefinition>;
  submitForm(input: FormSubmissionCreateInput): Promise<FormSubmission>;
  updateSubmission(id: number, input: FormSubmissionUpdateInput): Promise<FormSubmission>;
  listSubmissions(query: FormSubmissionListQuery): Promise<FormPage<FormSubmission>>;
  getSubmissionById(id: number): Promise<FormSubmission | null>;
}
