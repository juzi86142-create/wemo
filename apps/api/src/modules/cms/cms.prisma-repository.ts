import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { CMS_REPOSITORY, type CmsRepository } from "./cms.repository";
import type { ContentEntry, FormSubmission, ContentNavigation } from "@wemo/contracts";

@Injectable()
export class CmsPrismaRepository implements CmsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listContentEntries(query: any): Promise<{ items: ContentEntry[]; total: number; page: number; page_size: number }> {
    const where: any = {
      market: query.market,
      locale: query.locale,
    };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

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
      items: entries.map(e => this.mapContentEntry(e)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getContentEntry(market: string, locale: string, slug: string): Promise<ContentEntry | null> {
    const entry = await this.database.contentEntry.findFirst({
      where: { market, locale, slug, status: "published" },
    });

    return entry ? this.mapContentEntry(entry) : null;
  }

  async createContentEntry(input: any): Promise<ContentEntry> {
    const entry = await this.database.contentEntry.create({
      data: {
        type: input.type,
        locale: input.locale,
        market: input.market,
        slug: input.slug,
        title: input.title,
        body: input.body,
        seo: input.seo ?? {},
        status: input.status ?? "draft",
      },
    });

    return this.mapContentEntry(entry);
  }

  async updateContentEntry(id: number, input: any): Promise<ContentEntry> {
    const entry = await this.database.contentEntry.update({
      where: { id },
      data: {
        title: input.title,
        body: input.body,
        seo: input.seo,
        status: input.status,
      },
    });

    return this.mapContentEntry(entry);
  }

  async getNavigation(market: string, locale: string): Promise<ContentNavigation[]> {
    const entries = await this.database.contentEntry.findMany({
      where: {
        market,
        locale,
        type: "navigation",
        status: "published",
      },
    });

    return entries.map(e => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      url: `/navigation/${e.slug}`,
    }));
  }

  async listFormSubmissions(query: any): Promise<{ items: FormSubmission[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

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
      items: submissions.map(s => this.mapFormSubmission(s)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async createFormSubmission(input: any): Promise<FormSubmission> {
    const submissionNo = `SUB-${Date.now()}`;
    const submission = await this.database.formSubmission.create({
      data: {
        submissionNo,
        type: input.type,
        source: input.source,
        payload: input.payload,
        status: "new",
      },
    });

    return this.mapFormSubmission(submission);
  }

  private mapContentEntry(entry: any): ContentEntry {
    return {
      id: entry.id,
      type: entry.type,
      locale: entry.locale,
      market: entry.market,
      slug: entry.slug,
      title: entry.title,
      body: entry.body,
      seo: entry.seo,
      status: entry.status,
      published_at: entry.publishedAt?.toISOString() || null,
      archived_at: entry.archivedAt?.toISOString() || null,
      updated_at: entry.updatedAt.toISOString(),
    };
  }

  private mapFormSubmission(submission: any): FormSubmission {
    return {
      id: submission.id,
      submission_no: submission.submissionNo,
      type: submission.type,
      source: submission.source,
      payload: submission.payload,
      status: submission.status,
      created_at: submission.createdAt.toISOString(),
    };
  }
}
