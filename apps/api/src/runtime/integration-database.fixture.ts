import { createHash } from "node:crypto";

import { createDatabase, type DatabaseClient } from "@wemo/database";

/**
 * The HTTP integration suites exercise the production Prisma repositories.
 *
 * A fixture is deliberately kept in the test/runtime tree instead of the
 * application repositories: production code never falls back to this data
 * and the reset can only be requested explicitly with RUN_DATABASE_INTEGRATION.
 */

export function databaseIntegrationEnabled(): boolean {
  return process.env.RUN_DATABASE_INTEGRATION === "1";
}

function databaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "数据库集成测试需要 TEST_DATABASE_URL（建议使用专用测试库）或 DATABASE_URL",
    );
  }
  // Prisma reads DATABASE_URL when PrismaClient is constructed. Supporting a
  // separate TEST_DATABASE_URL keeps the destructive fixture away from the
  // normal development connection while preserving the normal client factory.
  process.env.DATABASE_URL = url;
  return url;
}

type AnyDatabase = DatabaseClient & Record<string, any>;

/**
 * Clear every application table in the selected PostgreSQL database.
 * Migrations intentionally do not add physical foreign keys, but CASCADE also
 * makes this safe if a developer has an older local schema with a constraint.
 */
async function resetDatabase(database: AnyDatabase): Promise<void> {
  const tables = await database.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_catalog.pg_tables
     WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  for (const table of tables) {
    if (!/^[a-zA-Z0-9_]+$/.test(table.tablename)) continue;
    await database.$executeRawUnsafe(
      `TRUNCATE TABLE "public"."${table.tablename}" RESTART IDENTITY CASCADE`,
    );
  }
}

async function resetSequences(database: AnyDatabase): Promise<void> {
  const tables = await database.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_catalog.pg_tables
     WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  for (const table of tables) {
    if (!/^[a-zA-Z0-9_]+$/.test(table.tablename)) continue;
    // All application entities use an integer `id @default(autoincrement())`.
    // Tables without a serial sequence simply return NULL and are ignored.
    await database.$executeRawUnsafe(
      `DO $$
       DECLARE sequence_name text;
       BEGIN
         sequence_name := pg_get_serial_sequence('public.${table.tablename}', 'id');
         IF sequence_name IS NOT NULL THEN
           PERFORM setval(
             sequence_name,
             COALESCE((SELECT MAX(id) FROM "public"."${table.tablename}"), 1),
             (SELECT COUNT(*) > 0 FROM "public"."${table.tablename}")
           );
         END IF;
       END $$`,
    );
  }
}

function at(now: Date): Date {
  return new Date(now.getTime());
}

/** Insert the stable demo catalog and platform rows used by HTTP scenarios. */
async function seedDatabase(database: AnyDatabase): Promise<void> {
  const now = new Date();
  const json = (value: unknown) => value as any;

  // Identity and authorization baseline. IDs intentionally match the old
  // contract fixture (users 1..3, roles 1..3, company 1).
  await database.role.createMany({
    data: [
      {
        id: 1,
        code: "user.default",
        name: "User",
        audience: "user",
        permissions: json([
          "account:read",
          "account:write",
          "orders:read",
          "returns:read",
          "subscriptions:write",
        ]),
      },
      {
        id: 2,
        code: "dealer.admin",
        name: "Dealer Admin",
        audience: "dealer",
        permissions: json([
          "dealer:read",
          "dealer:write",
          "dealer:company:read",
          "dealer:company:write",
          "dealer:member:read",
          "dealer:member:write",
          "dealer:application:write",
        ]),
      },
      {
        id: 3,
        code: "staff.admin",
        name: "Staff Admin",
        audience: "staff",
        permissions: json([
          "settings:read",
          "settings:write",
          "audit:read",
          "jobs:read",
          "jobs:write",
          "reports:read",
          "integrations:read",
          "analytics:read",
          "identity:read",
          "identity:write",
          "dealers:read",
          "dealers:write",
          "catalog:read",
          "catalog:write",
          "content:read",
          "content:write",
          "media:read",
          "media:write",
          "search:read",
          "seo:read",
          "seo:write",
          "forms:read",
          "forms:write",
          "notifications:read",
          "notifications:write",
          "pricing:read",
          "pricing:write",
          "inventory:read",
          "inventory:write",
          "cart:read",
          "cart:write",
          "orders:read",
          "orders:write",
          "payments:read",
          "payments:write",
          "returns:read",
          "returns:write",
          "quotes:read",
          "quotes:write",
          "localization:read",
          "localization:write",
        ]),
      },
    ],
  });

  const passwordHash = (password: string) => {
    // Must stay in sync with IdentityRepository.hashPassword.
    return createHash("sha256").update(`wemo:${password}`).digest("hex");
  };

  await database.user.createMany({
    data: [
      {
        id: 1,
        email: "user@wemove.local",
        passwordHash: passwordHash("user-pass"),
        name: "Wemove User",
        phone: null,
        locale: "en-US",
        audience: "user",
        status: "active",
        verifiedAt: at(now),
        createdAt: at(now),
        updatedAt: at(now),
      },
      {
        id: 2,
        email: "dealer@wemove.local",
        passwordHash: passwordHash("dealer-pass"),
        name: "Wemove Dealer",
        phone: null,
        locale: "en-US",
        audience: "dealer",
        status: "active",
        verifiedAt: at(now),
        createdAt: at(now),
        updatedAt: at(now),
      },
      {
        id: 3,
        email: "staff@wemove.local",
        passwordHash: passwordHash("staff-pass"),
        name: "Wemove Staff",
        phone: null,
        locale: "en-US",
        audience: "staff",
        status: "active",
        verifiedAt: at(now),
        createdAt: at(now),
        updatedAt: at(now),
      },
    ],
  });
  await database.userRole.createMany({
    data: [
      { id: 1, userId: 1, roleId: 1, overrides: json([]) },
      { id: 2, userId: 2, roleId: 2, overrides: json([]) },
      { id: 3, userId: 3, roleId: 3, overrides: json([]) },
    ],
  });

  await database.dealerCompany.create({
    data: {
      id: 1,
      legalName: "Demo Toys Ltd.",
      displayName: "Demo Toys",
      country: "US",
      tierId: 1,
      priceListId: 1,
      currency: "USD",
      terms: json({ payment_terms: "Net 30" }),
      website: "https://demo.example.com",
      businessType: "distributor",
      taxId: "DEMO-123",
      paymentTerms: "Net 30",
      salesTerritories: json({ countries: ["US"] }),
      authorizedCategories: json({ ids: [1, 2] }),
      salesRep: "demo.representative@wemove.local",
      publicListing: true,
      status: "active",
      createdAt: at(now),
      archivedAt: null,
    },
  });
  await database.dealerMember.create({
    data: {
      id: 1,
      companyId: 1,
      userId: 2,
      role: "admin",
      permissions: json([
        "dealer:read",
        "dealer:write",
        "dealer:company:read",
        "dealer:company:write",
        "dealer:member:read",
        "dealer:member:write",
      ]),
      status: "active",
      invitedAt: null,
      joinedAt: at(now),
    },
  });
  await database.dealerApplication.create({
    data: {
      id: 1,
      applicationNo: "DA-000001",
      applicantUserId: 2,
      companyId: 1,
      legalName: "Demo Toys Ltd.",
      displayName: "Demo Toys",
      country: "US",
      website: "https://demo.example.com",
      businessType: "distributor",
      taxId: "DEMO-123",
      contactName: "Dealer Admin",
      contactEmail: "dealer@wemove.local",
      contactPhone: "+1-555-0100",
      currency: "USD",
      payload: json({ notes: "Seed application" }),
      status: "approved",
      submittedAt: at(now),
      reviewedAt: at(now),
      reviewNote: "Seeded active dealer",
      createdAt: at(now),
      updatedAt: at(now),
    },
  });

  await database.language.createMany({
    data: [
      {
        id: 1,
        code: "en-US",
        label: "English (US)",
        nativeLabel: "English (US)",
        status: "active",
        createdAt: at(now),
        updatedAt: at(now),
      },
      {
        id: 2,
        code: "zh-CN",
        label: "简体中文",
        nativeLabel: "简体中文",
        status: "active",
        createdAt: at(now),
        updatedAt: at(now),
      },
    ],
  });
  await database.market.createMany({
    data: [
      {
        id: 1,
        code: "global",
        defaultLocale: "en-US",
        currency: "USD",
        timezone: "UTC",
        settings: json({ fallback_locales: ["en-US", "zh-CN"], fallback_policy: "default_locale" }),
        status: "active",
      },
      {
        id: 2,
        code: "US",
        defaultLocale: "en-US",
        currency: "USD",
        timezone: "America/New_York",
        settings: json({ fallback_locales: ["en-US", "zh-CN"], fallback_policy: "default_locale" }),
        status: "active",
      },
    ],
  });
  await database.marketLocale.createMany({
    data: [
      { id: 1, marketId: 1, languageId: 1, locale: "en-US", pathPrefix: "/", isDefault: true, sortOrder: 0, status: "active" },
      { id: 2, marketId: 1, languageId: 2, locale: "zh-CN", pathPrefix: "/zh-cn", isDefault: false, sortOrder: 1, status: "active" },
      { id: 3, marketId: 2, languageId: 1, locale: "en-US", pathPrefix: "/us", isDefault: true, sortOrder: 0, status: "active" },
    ],
  });

  await database.category.createMany({
    data: [
      { id: 1, parentId: null, slug: "vehicles", name: "Vehicles", status: "active", sortOrder: 1, localizedContent: json({ "en-US": { name: "Vehicles" }, "zh-CN": { name: "交通玩具" } }), createdAt: at(now), updatedAt: at(now) },
      { id: 2, parentId: null, slug: "creative-play", name: "Creative Play", status: "active", sortOrder: 2, localizedContent: json({ "en-US": { name: "Creative Play" }, "zh-CN": { name: "创意玩乐" } }), createdAt: at(now), updatedAt: at(now) },
    ],
  });
  // Product IDs and variant IDs intentionally preserve the historical demo
  // contract: BUS is variant 2 and RACER is variant 4.
  await database.product.createMany({
    data: [
      {
        id: 1,
        primaryCategoryId: 1,
        status: "active",
        ageMin: 3,
        ageMax: 8,
        attributes: json({ name: "Demo Bus", short_description: "A friendly bus for everyday play.", description: "Stable product detail for the public catalog.", tags: ["vehicle", "education"], primary_image_url: "https://images.example.com/demo-bus.jpg", category_ids: [1], media_asset_ids: [1], related_product_ids: [3], localized_content: { "en-US": { description: "A friendly bus for everyday play." } } }),
        marketVisibility: json({ markets: ["global", "US"] }),
        publishedAt: at(now),
        archivedAt: null,
        createdAt: at(now),
        updatedAt: at(now),
      },
      {
        id: 3,
        primaryCategoryId: 1,
        status: "active",
        ageMin: 4,
        ageMax: 10,
        attributes: json({ name: "Demo Racer", short_description: "A compact racer for fast hands.", description: "Second seeded product for catalog and search flows.", tags: ["vehicle", "speed"], primary_image_url: "https://images.example.com/demo-racer.jpg", category_ids: [1, 2], media_asset_ids: [2], related_product_ids: [1], localized_content: { "en-US": { description: "A compact racer for fast hands." } } }),
        marketVisibility: json({ markets: ["global", "US"] }),
        publishedAt: at(now),
        archivedAt: null,
        createdAt: at(now),
        updatedAt: at(now),
      },
    ],
  });
  await database.productTranslation.createMany({
    data: [
      { id: 1, productId: 1, locale: "en-US", market: "global", slug: "demo-bus", name: "Demo Bus", shortDescription: "A friendly bus for everyday play.", content: json({ description: "Stable product detail for the public catalog." }) },
      { id: 2, productId: 3, locale: "en-US", market: "global", slug: "demo-racer", name: "Demo Racer", shortDescription: "A compact racer for fast hands.", content: json({ description: "Second seeded product for catalog and search flows." }) },
    ],
  });
  await database.variant.createMany({
    data: [
      { id: 2, productId: 1, sku: "BUS-001", barcode: "BUS-001", options: json({ color: "yellow" }), specifications: json({ length_cm: 22 }), status: "active", createdAt: at(now), updatedAt: at(now) },
      { id: 4, productId: 3, sku: "RACER-001", barcode: "RACER-001", options: json({ color: "red" }), specifications: json({ length_cm: 18 }), status: "active", createdAt: at(now), updatedAt: at(now) },
    ],
  });
  await database.mediaAsset.createMany({
    data: [
      { id: 1, type: "image", fileKey: "catalog/demo-bus.jpg", mime: "image/jpeg", size: 245000, checksum: "demo-bus-checksum", alt: "Demo Bus", visibility: "public", version: "1", tags: json(["product", "hero"]), versions: json([{ version: "1", file_key: "catalog/demo-bus.jpg", mime: "image/jpeg", size: 245000, checksum: "demo-bus-checksum", created_at: now.toISOString() }]), metadata: json({ width: 1600, height: 900 }), createdAt: at(now), updatedAt: at(now) },
      { id: 2, type: "image", fileKey: "catalog/demo-racer.jpg", mime: "image/jpeg", size: 198000, checksum: "demo-racer-checksum", alt: "Demo Racer", visibility: "registered", version: "1", tags: json(["product", "detail"]), versions: json([{ version: "1", file_key: "catalog/demo-racer.jpg", mime: "image/jpeg", size: 198000, checksum: "demo-racer-checksum", created_at: now.toISOString() }]), metadata: json({ width: 1440, height: 960 }), createdAt: at(now), updatedAt: at(now) },
    ],
  });
  await database.contentEntry.createMany({
    data: [
      { id: 1, type: "page", locale: "en-US", market: "global", slug: "home", title: "WEMOVE SPORTS", body: json({ sections: [{ kind: "hero", title: "WEMOVE SPORTS", description: "Move better." }] }), seo: json({ title: "WEMOVE SPORTS", description: "Official home page", canonical_url: "https://www.wemovetoy.com/", indexable: true }), status: "published", createdAt: at(now), publishedAt: at(now), archivedAt: null, updatedAt: at(now) },
      { id: 2, type: "article", locale: "en-US", market: "global", slug: "toy-safety-guide", title: "Toy Safety Guide", body: json({ paragraphs: ["Safety first.", "Read the guide before play."] }), seo: json({ title: "Toy Safety Guide", description: "Safety guidance for families.", canonical_url: "https://www.wemovetoy.com/articles/toy-safety-guide", indexable: true }), status: "published", createdAt: at(now), publishedAt: at(now), archivedAt: null, updatedAt: at(now) },
      { id: 3, type: "faq", locale: "en-US", market: "global", slug: "shipping", title: "Shipping FAQ", body: json({ questions: [{ q: "Do you ship internationally?", a: "Yes, in selected markets." }] }), seo: json({ title: "Shipping FAQ", description: "Common questions about shipping.", canonical_url: "https://www.wemovetoy.com/faq/shipping", indexable: true }), status: "published", createdAt: at(now), publishedAt: at(now), archivedAt: null, updatedAt: at(now) },
      { id: 4, type: "navigation", locale: "en-US", market: "global", slug: "main", title: "Main Navigation", body: json({ items: [{ id: 1, label: "Home", path: "/", order: 1, children: [] }, { id: 2, label: "Products", path: "/products", order: 2, children: [] }] }), seo: json({ title: "Main Navigation", description: "Primary navigation", indexable: false }), status: "published", createdAt: at(now), publishedAt: at(now), archivedAt: null, updatedAt: at(now) },
    ],
  });
  await database.redirect.create({ data: { id: 1, sourcePath: "/old-home", targetPath: "/", statusCode: 301, createdAt: at(now) } });

  await database.priceList.create({ data: { id: 1, code: "dealer-default", name: "Dealer Default", market: "global", currency: "USD", status: "active" } });
  await database.price.createMany({
    data: [
      { id: 1, variantId: 2, priceListId: null, dealerTierId: null, dealerCompanyId: null, market: "global", currency: "USD", priceType: "msrp", amountMinor: 3999, minQuantity: 1, rules: json({ source: "seed" }), validFrom: null, validTo: null, createdAt: at(now), updatedAt: at(now) },
      { id: 2, variantId: 2, priceListId: 1, dealerTierId: null, dealerCompanyId: null, market: "global", currency: "USD", priceType: "price_list", amountMinor: 3499, minQuantity: 1, rules: json({ source: "seed" }), validFrom: null, validTo: null, createdAt: at(now), updatedAt: at(now) },
      { id: 3, variantId: 2, priceListId: null, dealerTierId: 1, dealerCompanyId: null, market: "global", currency: "USD", priceType: "dealer_tier", amountMinor: 3199, minQuantity: 1, rules: json({ source: "seed" }), validFrom: null, validTo: null, createdAt: at(now), updatedAt: at(now) },
      { id: 4, variantId: 4, priceListId: null, dealerTierId: null, dealerCompanyId: 1, market: "global", currency: "USD", priceType: "dealer_company", amountMinor: 2899, minQuantity: 1, rules: json({ source: "seed" }), validFrom: null, validTo: null, createdAt: at(now), updatedAt: at(now) },
    ],
  });
  await database.inventoryBalance.createMany({
    data: [
      { id: 1, variantId: 2, warehouseCode: "WH-US-1", market: "global", onHand: 120, available: 120, reserved: 0, source: "seed", syncedAt: at(now), updatedAt: at(now) },
      { id: 2, variantId: 4, warehouseCode: "WH-US-1", market: "global", onHand: 80, available: 80, reserved: 0, source: "seed", syncedAt: at(now), updatedAt: at(now) },
    ],
  });

  await database.notificationTemplate.createMany({
    data: [
      { id: 1, templateKey: "content_published", locale: "en-US", channel: "email", version: 1, subject: "Content published", body: "Content {slug} has been published.", variables: json(["slug"]), status: "active", createdAt: at(now), updatedAt: at(now) },
      { id: 2, templateKey: "form_received", locale: "en-US", channel: "email", version: 1, subject: "Form received", body: "A new form submission {submission_no} has been received.", variables: json(["submission_no"]), status: "active", createdAt: at(now), updatedAt: at(now) },
      { id: 3, templateKey: "order_confirmation", locale: "en-US", channel: "email", version: 1, subject: "Order confirmation", body: "Your order {order_no} is confirmed.", variables: json(["order_no"]), status: "active", createdAt: at(now), updatedAt: at(now) },
      { id: 4, templateKey: "quote_updated", locale: "en-US", channel: "email", version: 1, subject: "Quote updated", body: "Quote {quote_no} is ready for review.", variables: json(["quote_no"]), status: "active", createdAt: at(now), updatedAt: at(now) },
    ],
  });
  await database.systemSetting.createMany({
    data: [
      { id: 1, groupName: "platform", key: "default_market", value: json("global"), version: "1", updatedBy: 1, updatedAt: at(now) },
      { id: 2, groupName: "platform", key: "default_locale", value: json("en-US"), version: "1", updatedBy: 1, updatedAt: at(now) },
      { id: 3, groupName: "jobs", key: "max_attempts", value: json(3), version: "1", updatedBy: 1, updatedAt: at(now) },
      { id: 4, groupName: "integrations", key: "webhook_signature_mode", value: json("demo"), version: "1", updatedBy: 1, updatedAt: at(now) },
    ],
  });
  await database.integrationConfig.createMany({
    data: [
      { id: 1, integrationKey: "mailpit", provider: "mailpit", environment: "local", status: "active", config: json({ capabilities: ["send", "track"], endpoint: "http://localhost:1025" }) },
      { id: 2, integrationKey: "postgres-search", provider: "postgres", environment: "local", status: "active", config: json({ capabilities: ["query", "index"], engine: "fts" }) },
      { id: 3, integrationKey: "minio", provider: "minio", environment: "local", status: "active", config: json({ capabilities: ["upload", "download", "signed-url"], bucket: "wemove-local" }) },
    ],
  });

  await resetSequences(database);
}

export async function setupIntegrationDatabase(): Promise<DatabaseClient> {
  const url = databaseUrl();
  if (!url) throw new Error("测试数据库 URL 为空");
  const database = createDatabase() as AnyDatabase;
  await database.$connect();
  await resetDatabase(database);
  await seedDatabase(database);
  return database;
}

export async function teardownIntegrationDatabase(
  database: DatabaseClient | null | undefined,
): Promise<void> {
  await database?.$disconnect();
}
