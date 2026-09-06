import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import type {
  ContentEntry,
  ContentEntryCreateInput,
  ContentEntryListQuery,
  ContentEntryUpdateInput,
  ContentNavigation,
  FormSubmission,
  FormSubmissionCreateInput,
  FormSubmissionListQuery,
  JsonValue,
} from "@wemo/contracts";

import { DATABASE_CLIENT } from "../../database/database.constants";
import { CMS_REPOSITORY, type CmsRepository } from "./cms.repository";

type ContentEntryRow = NonNullable<
  Awaited<ReturnType<DatabaseClient["contentEntry"]["findFirst"]>>
>;
type FormSubmissionRow = NonNullable<
  Awaited<ReturnType<DatabaseClient["formSubmission"]["findFirst"]>>
>;

const NO_TIMESTAMP_ISO = "1970-01-01T00:00:00.000Z";

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNavigationItems(body: unknown): ContentNavigation["items"] {
  const record = readRecord(body);
  const raw = record?.items;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const entry = readRecord(item);
      if (!entry) return null;
      const label = typeof entry.label === "string" ? entry.label : "";
      const path = typeof entry.url === "string" ? entry.url : "";
      if (label === "" || path === "") return null;
      return {
        id:
          typeof entry.id === "number" ? entry.id : index + 1,
        label,
        path,
        order: typeof entry.order === "number" ? entry.order : index,
        children: Array.isArray(entry.children)
          ? readNavigationItems({ items: entry.children })
          : [],
      } as ContentNavigation["items"][number];
    })
    .filter((item): item is ContentNavigation["items"][number] => item !== null);
}

@Injectable()
export class CmsPrismaRepository implements CmsRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
  ) {}

  async listContentEntries(
    query: ContentEntryListQuery & { status?: string },
  ): Promise<{
    items: ContentEntry[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const where = {
      ...(query.market !== undefined ? { market: query.market } : {}),
      ...(query.locale !== undefined ? { locale: query.locale } : {}),
      ...(query.type !== undefined ? { type: query.type } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
    };

    const [entries, total] = await Promise.all([
      this.database.contentEntry.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { updatedAt: "desc" },
      }),
      this.database.contentEntry.count({ where }),
    ]);

    return {
      items: entries.map((entry) => this.mapContentEntry(entry)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getContentEntry(
    market: string,
    locale: string,
    slug: string,
  ): Promise<ContentEntry | null> {
    const entry = await this.database.contentEntry.findFirst({
      where: { market, locale, slug, status: "published" },
    });

    return entry ? this.mapContentEntry(entry) : null;
  }

  async createContentEntry(
    input: ContentEntryCreateInput,
  ): Promise<ContentEntry> {
    const entry = await this.database.contentEntry.create({
      data: {
        type: input.type,
        locale: input.locale,
        market: input.market,
        slug: input.slug,
        title: input.title,
        body: input.body as never,
        seo: (input.seo ?? {}) as never,
        status: input.status ?? "draft",
      },
    });

    return this.mapContentEntry(entry);
  }

  async updateContentEntry(
    id: number,
    input: ContentEntryUpdateInput & { status?: string },
  ): Promise<ContentEntry> {
    const entry = await this.database.contentEntry.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.body !== undefined ? { body: input.body as never } : {}),
        ...(input.seo !== undefined ? { seo: input.seo as never } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    return this.mapContentEntry(entry);
  }

  async getNavigation(
    market: string,
    locale: string,
  ): Promise<ContentNavigation[]> {
    const entries = await this.database.contentEntry.findMany({
      where: {
        market,
        locale,
        type: "navigation",
        status: "published",
      },
    });

    return entries.map((entry) => ({
      id: entry.id,
      slug: entry.slug,
      market: entry.market,
      locale: entry.locale,
      status: entry.status as ContentNavigation["status"],
      items: readNavigationItems(entry.body),
      created_at: NO_TIMESTAMP_ISO,
      updated_at: entry.updatedAt.toISOString(),
    }));
  }

  async listFormSubmissions(
    query: FormSubmissionListQuery,
  ): Promise<{
    items: FormSubmission[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const where = {
      ...(query.type !== undefined ? { type: query.type } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.assignee_id !== undefined
        ? { assigneeId: query.assignee_id }
        : {}),
    };

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
      items: submissions.map((submission) =>
        this.mapFormSubmission(submission),
      ),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async createFormSubmission(
    input: FormSubmissionCreateInput,
  ): Promise<FormSubmission> {
    const submissionNo = `SUB-${Date.now()}`;
    const submission = await this.database.formSubmission.create({
      data: {
        submissionNo,
        type: input.type,
        source: input.source,
        payload: input.payload as never,
        status: "new",
      },
    });

    return this.mapFormSubmission(submission);
  }

  private mapContentEntry(entry: ContentEntryRow): ContentEntry {
    return {
      id: entry.id,
      type: entry.type,
      slug: entry.slug,
      title: entry.title,
      body: entry.body as JsonValue,
      seo: entry.seo as ContentEntry["seo"],
      status: entry.status as ContentEntry["status"],
      locale: entry.locale,
      market: entry.market,
      translation_status: "published",
      linked_product_ids: [],
      media_asset_ids: [],
      published_at: entry.publishedAt?.toISOString() ?? null,
      archived_at: entry.archivedAt?.toISOString() ?? null,
      created_at: NO_TIMESTAMP_ISO,
      updated_at: entry.updatedAt.toISOString(),
    };
  }

  private mapFormSubmission(submission: FormSubmissionRow): FormSubmission {
    return {
      id: submission.id,
      submission_no: submission.submissionNo,
      type: submission.type,
      source: submission.source,
      payload: submission.payload as JsonValue,
      attachments: [],
      assignee_id: submission.assigneeId,
      priority: "normal",
      tags: [],
      internal_note: null,
      status: submission.status,
      request_id: submission.submissionNo,
      created_at: submission.createdAt.toISOString(),
      updated_at: submission.updatedAt.toISOString(),
      history: [],
    };
  }
}
