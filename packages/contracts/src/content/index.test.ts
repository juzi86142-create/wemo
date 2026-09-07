import { describe, expect, it } from "vitest";

import {
  ContentEntrySchema,
  ContentStatusSchema,
  FormSubmissionCreateSchema,
  LocalizationSnapshotSchema,
  MediaAssetSchema,
  NotificationDeliverySchema,
  SearchQuerySchema,
} from "./index.js";

const timestamp = "2026-09-05T00:00:00.000Z";

describe("content contracts", () => {
  it("parses public content, media, search, and localization payloads", () => {
    expect(
      ContentEntrySchema.parse({
        id: 1,
        type: "page",
        slug: "home",
        title: "WEMOVE SPORTS",
        body: { sections: [{ kind: "hero", title: "WEMOVE SPORTS" }] },
        seo: {
          title: "WEMOVE SPORTS",
          description: "Official home page",
          canonical_url: "https://www.wemovetoy.com/",
          indexable: true,
        },
        status: "published",
        locale: "en-US",
        market: "global",
        translation_status: "published",
        linked_product_ids: [1, 2],
        media_asset_ids: [1],
        published_at: timestamp,
        archived_at: null,
        created_at: timestamp,
        updated_at: timestamp,
      }),
    ).toMatchObject({
      slug: "home",
      seo: {
        canonical_url: "https://www.wemovetoy.com/",
      },
    });

    expect(
      MediaAssetSchema.parse({
        id: 1,
        type: "image",
        file_key: "catalog/demo-bus.jpg",
        mime: "image/jpeg",
        size: 245000,
        checksum: "demo-bus-checksum",
        alt: "Demo Bus",
        visibility: "public",
        tags: ["product", "hero"],
        versions: [
          {
            version: "1",
            file_key: "catalog/demo-bus.jpg",
            mime: "image/jpeg",
            size: 245000,
            checksum: "demo-bus-checksum",
            created_at: timestamp,
          },
        ],
        metadata: { width: 1600, height: 900 },
        created_at: timestamp,
        updated_at: timestamp,
      }),
    ).toMatchObject({
      visibility: "public",
      file_key: "catalog/demo-bus.jpg",
    });

    expect(
      SearchQuerySchema.parse({
        q: "demo",
        market: "global",
        locale: "en-US",
        page_size: 10,
      }),
    ).toMatchObject({
      q: "demo",
      page: 1,
      page_size: 10,
    });

    expect(
      LocalizationSnapshotSchema.parse({
        request_id: "req_001",
        item: {
          markets: [
            {
              code: "global",
              default_locale: "en-US",
              currency: "USD",
              timezone: "UTC",
              fallback_locales: ["en-US", "zh-CN"],
              status: "active",
            },
          ],
          locales: [
            {
              code: "en-US",
              name: "English (US)",
              market: "global",
              direction: "ltr",
              fallback_locale: null,
              status: "active",
            },
          ],
          routes: [
            {
              market: "global",
              locale: "en-US",
              prefix: "/",
              default: true,
              fallback_chain: ["en-US", "zh-CN"],
            },
          ],
        },
      }),
    ).toMatchObject({
      request_id: "req_001",
      item: {
        markets: [{ code: "global" }],
        routes: [{ prefix: "/" }],
      },
    });
  });

  it("parses forms and notifications and rejects invalid content states", () => {
    expect(
      FormSubmissionCreateSchema.parse({
        type: "contact",
        source: "public-site",
        payload: { name: "Buyer", message: "Please call me back" },
        attachments: [1],
        priority: "high",
        tags: ["sales"],
      }),
    ).toMatchObject({
      type: "contact",
      attachments: [1],
      priority: "high",
    });

    expect(
      NotificationDeliverySchema.parse({
        id: 1,
        template_code: "form_received",
        recipient_user_id: null,
        company_id: null,
        audience: "staff",
        channel: "email",
        status: "queued",
        request_id: "req_002",
        payload: { submission_no: "FS-000001" },
        attempts: 1,
        provider_message_id: null,
        failure_reason: null,
        created_at: timestamp,
        sent_at: null,
        updated_at: timestamp,
      }),
    ).toMatchObject({
      template_code: "form_received",
      status: "queued",
    });

    expect(ContentStatusSchema.safeParse("ready_for_launch").success).toBe(
      false,
    );
  });
});
