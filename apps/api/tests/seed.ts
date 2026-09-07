import { createDatabase } from "@wemo/database";
import { Redis } from "ioredis";

import { hashPassword } from "../src/modules/auth/password";
import { loadEnvFile } from "../src/runtime/env";

loadEnvFile();

const database = createDatabase();
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6380", {
  maxRetriesPerRequest: 2,
});

const NOTIFICATION_TEMPLATES_KEY = "wemo:notifications:templates";

/** 演示账号统一密码 登录文档与前端联调用 */
const DEMO_PASSWORD = "Demo1234!";

/**
 * 演示数据填充 仅做新增与跳过 永不删除已有数据
 * 每个实体按自然键判断存在性 已存在则跳过
 */
async function main() {
  console.log("开始 seeding 数据库（演示数据，非破坏性）...");

  await seedLanguages();
  await seedMarkets();
  await seedRoles();
  await seedUsers();
  await seedTiers();
  await seedCategories();
  await seedProducts();
  await seedContent();
  await seedSettings();
  await seedNotificationTemplates();

  console.log("Seeding 完成！已有数据未被修改。");
}

async function seedLanguages() {
  console.log(" seeding languages...");

  const languages = [
    { code: "en", label: "English", nativeLabel: "English" },
    { code: "zh", label: "Chinese", nativeLabel: "中文" },
  ];

  let created = 0;
  for (const language of languages) {
    const existing = await database.language.findUnique({
      where: { code: language.code },
    });
    if (existing) continue;
    await database.language.create({
      data: { ...language, status: "active" },
    });
    created += 1;
  }

  console.log(`  ✓ 创建 ${created} 种语言（跳过 ${languages.length - created}）`);
}

async function seedMarkets() {
  console.log(" seeding markets...");

  const en = await database.language.findUnique({ where: { code: "en" } });
  const zh = await database.language.findUnique({ where: { code: "zh" } });
  if (!en || !zh) throw new Error("语言未初始化");

  const markets = [
    {
      code: "US",
      currency: "USD",
      timezone: "America/New_York",
      fallbackPolicy: "default_locale",
      locales: [{ locale: "en-US", language: en, pathPrefix: "en-us", isDefault: true }],
    },
    {
      code: "CN",
      currency: "CNY",
      timezone: "Asia/Shanghai",
      fallbackPolicy: "default_locale",
      locales: [{ locale: "zh-CN", language: zh, pathPrefix: "zh-cn", isDefault: true }],
    },
  ];

  let created = 0;
  for (const market of markets) {
    const existing = await database.market.findUnique({
      where: { code: market.code },
    });
    if (existing) {
      // 存量市场补全交易开关配置 其余数据不动
      const settings = (existing.settings ?? {}) as Record<string, unknown>;
      if (
        typeof settings.b2c_enabled !== "boolean" ||
        typeof settings.dealer_enabled !== "boolean"
      ) {
        await database.market.update({
          where: { id: existing.id },
          data: {
            settings: {
              ...settings,
              b2c_enabled: true,
              dealer_enabled: true,
            } as never,
          },
        });
      }
      continue;
    }
    const createdMarket = await database.market.create({
      data: {
        code: market.code,
        defaultLocale: market.locales.find((locale) => locale.isDefault)!.locale,
        currency: market.currency,
        timezone: market.timezone,
        settings: {
          fallback_policy: market.fallbackPolicy,
          b2c_enabled: true,
          dealer_enabled: true,
        },
        status: "active",
      },
    });

    await database.marketLocale.createMany({
      data: market.locales.map((locale, index) => ({
        marketId: createdMarket.id,
        languageId: locale.language.id,
        locale: locale.locale,
        pathPrefix: locale.pathPrefix,
        isDefault: locale.isDefault,
        sortOrder: index,
        status: "active",
      })),
    });
    created += 1;
  }

  console.log(`  ✓ 创建 ${created} 个市场（跳过 ${markets.length - created}）`);
}

async function seedRoles() {
  console.log(" seeding roles...");

  const adminPermissions = [
    "analytics:read",
    "audit:read",
    "cart:read",
    "catalog:read",
    "catalog:write",
    "content:read",
    "content:write",
    "dealers:read",
    "dealers:write",
    "forms:read",
    "forms:write",
    "identity:read",
    "identity:write",
    "integrations:read",
    "inventory:read",
    "jobs:read",
    "jobs:write",
    "media:read",
    "media:write",
    "notifications:read",
    "notifications:write",
    "payments:read",
    "pricing:read",
    "pricing:write",
    "quotes:write",
    "reports:read",
    "returns:write",
    "seo:read",
    "seo:write",
    "settings:read",
    "settings:write",
  ];
  const contentEditorPermissions = [
    "content:read",
    "content:write",
    "media:read",
    "media:write",
    "seo:read",
    "seo:write",
    "forms:read",
    "notifications:read",
    "analytics:read",
  ];
  const dealerOpsPermissions = [
    "dealers:read",
    "dealers:write",
    "pricing:read",
    "pricing:write",
    "inventory:read",
    "quotes:write",
    "reports:read",
  ];
  const supportPermissions = [
    "forms:read",
    "forms:write",
    "payments:read",
    "returns:write",
    "identity:read",
  ];

  const roles = [
    {
      code: "admin",
      name: "Administrator",
      audience: "staff",
      permissions: adminPermissions,
    },
    {
      code: "content_editor",
      name: "Content Editor",
      audience: "staff",
      permissions: contentEditorPermissions,
    },
    {
      code: "dealer_ops",
      name: "Dealer Operations",
      audience: "staff",
      permissions: dealerOpsPermissions,
    },
    {
      code: "support",
      name: "Customer Support",
      audience: "staff",
      permissions: supportPermissions,
    },
    { code: "customer", name: "Customer", audience: "user", permissions: [] },
    { code: "dealer", name: "Dealer", audience: "dealer", permissions: [] },
  ];

  let created = 0;
  for (const role of roles) {
    const existing = await database.role.findUnique({
      where: { code: role.code },
    });
    if (existing) {
      // 存量角色权限为空时补齐为种子定义 其余字段不动
      if (
        role.permissions.length > 0 &&
        (existing.permissions as unknown[]).length === 0
      ) {
        await database.role.update({
          where: { id: existing.id },
          data: { permissions: role.permissions },
        });
      }
      continue;
    }
    await database.role.create({ data: role });
    created += 1;
  }

  console.log(`  ✓ 创建 ${created} 个角色（跳过 ${roles.length - created}）`);
}

async function seedUsers() {
  console.log(" seeding users...");

  const demoPasswordHash = hashPassword(DEMO_PASSWORD);

  const users = [
    {
      email: "admin@wemove.com",
      name: "Admin User",
      audience: "staff",
      roleCode: "admin",
      status: "active",
    },
    {
      email: "user@example.com",
      name: "Demo User",
      audience: "user",
      roleCode: "customer",
      status: "active",
    },
  ];

  let created = 0;
  for (const user of users) {
    const existing = await database.user.findUnique({
      where: { email: user.email },
    });
    if (existing) {
      // 存量演示账号使用旧格式哈希时一次性迁移为 scrypt 其余数据不动
      if (!existing.passwordHash.startsWith("scrypt$")) {
        await database.user.update({
          where: { id: existing.id },
          data: { passwordHash: demoPasswordHash },
        });
      }
      continue;
    }
    const createdUser = await database.user.create({
      data: {
        email: user.email,
        passwordHash: demoPasswordHash,
        name: user.name,
        audience: user.audience,
        status: user.status,
        verifiedAt: new Date(),
      },
    });

    const role = await database.role.findFirst({
      where: { code: user.roleCode },
    });
    if (role) {
      await database.userRole.create({
        data: { userId: createdUser.id, roleId: role.id, overrides: {} },
      });
    }
    created += 1;
  }

  // 演示经销商：公司 + 成员（成员存在则整体跳过）
  let dealerCreated = 0;
  const existingDealer = await database.user.findUnique({
    where: { email: "dealer@example.com" },
  });
  if (existingDealer) {
    // 存量演示账号使用旧格式哈希时一次性迁移为 scrypt 其余数据不动
    if (!existingDealer.passwordHash.startsWith("scrypt$")) {
      await database.user.update({
        where: { id: existingDealer.id },
        data: { passwordHash: demoPasswordHash },
      });
    }
    // 存量演示公司补全读取侧必填的 terms 字段 其余数据不动
    const existingCompany = await database.dealerCompany.findFirst({
      where: { displayName: "Demo Sports" },
    });
    if (existingCompany) {
      const terms = (existingCompany.terms ?? {}) as Record<string, unknown>;
      const missing: Record<string, unknown> = {};
      if (typeof terms.business_type !== "string") {
        missing.business_type = "general";
      }
      if (typeof terms.payment_terms !== "string") {
        missing.payment_terms = "net30";
      }
      if (!Array.isArray(terms.sales_territories)) {
        missing.sales_territories = ["US"];
      }
      if (Object.keys(missing).length > 0) {
        await database.dealerCompany.update({
          where: { id: existingCompany.id },
          data: { terms: { ...terms, ...missing } as never },
        });
      }
    }
  } else {
    const dealerUser = await database.user.create({
      data: {
        email: "dealer@example.com",
        passwordHash: demoPasswordHash,
        name: "Dealer Contact",
        audience: "dealer",
        status: "active",
        verifiedAt: new Date(),
      },
    });
    const dealerRole = await database.role.findFirst({
      where: { code: "dealer" },
    });
    if (dealerRole) {
      await database.userRole.create({
        data: { userId: dealerUser.id, roleId: dealerRole.id, overrides: {} },
      });
    }
    const company = await database.dealerCompany.create({
      data: {
        legalName: "Demo Sports Trading Co.",
        displayName: "Demo Sports",
        country: "US",
        currency: "USD",
        terms: {
          business_type: "general",
          payment_terms: "net30",
          sales_territories: ["US"],
          authorized_categories: [],
        },
        publicListing: true,
        status: "active",
      },
    });
    await database.dealerMember.create({
      data: {
        companyId: company.id,
        userId: dealerUser.id,
        role: "admin",
        permissions: ["dealer:read", "dealer:write"],
        status: "active",
      },
    });
    dealerCreated = 1;
  }

  console.log(
    `  ✓ 创建 ${created} 个用户 + ${dealerCreated} 个经销商账号（跳过已存在）`,
  );
}

async function seedTiers() {
  console.log(" seeding dealer tiers...");

  const tiers = [
    { code: "distributor", name: "Distributor", sortOrder: 1 },
    { code: "wholesale", name: "Wholesale", sortOrder: 2 },
    { code: "retail_partner", name: "Retail Partner", sortOrder: 3 },
  ];

  let created = 0;
  for (const tier of tiers) {
    const existing = await database.dealerTier.findUnique({
      where: { code: tier.code },
    });
    if (existing) continue;
    await database.dealerTier.create({
      data: { ...tier, status: "active" },
    });
    created += 1;
  }

  console.log(`  ✓ 创建 ${created} 个经销商等级（跳过 ${tiers.length - created}）`);
}

async function seedCategories() {
  console.log(" seeding categories...");

  const categories = [
    { slug: "bowling", sortOrder: 1 },
    { slug: "balance-board", sortOrder: 2 },
    { slug: "sports-games", sortOrder: 3 },
  ];

  let created = 0;
  for (const category of categories) {
    const existing = await database.category.findFirst({
      where: { slug: category.slug },
    });
    if (existing) continue;
    await database.category.create({
      data: {
        slug: category.slug,
        status: "active",
        sortOrder: category.sortOrder,
        localizedContent: {
          en: { name: category.slug },
          zh: { name: category.slug },
        },
      },
    });
    created += 1;
  }

  console.log(`  ✓ 创建 ${created} 个分类（跳过 ${categories.length - created}）`);
}

async function seedProducts() {
  console.log(" seeding products...");

  const bowling = await database.category.findFirst({
    where: { slug: "bowling" },
  });
  const balance = await database.category.findFirst({
    where: { slug: "balance-board" },
  });
  if (!bowling || !balance) throw new Error("分类未初始化");

  const us = await database.market.findUnique({ where: { code: "US" } });
  const cn = await database.market.findUnique({ where: { code: "CN" } });
  if (!us || !cn) throw new Error("市场未初始化");

  const products = [
    {
      category: bowling,
      sku: "WEMO-BOWL-001",
      ageMin: 3,
      ageMax: 10,
      names: { "en-US": "Kids Bowling Set", "zh-CN": "儿童保龄球套装" },
      descriptions: {
        "en-US": "Fun bowling set for kids",
        "zh-CN": "适合儿童的趣味保龄球套装",
      },
      prices: [
        { market: "US", currency: "USD", amountMinor: 4999, priceType: "retail" },
        { market: "CN", currency: "CNY", amountMinor: 39900, priceType: "retail" },
      ],
    },
    {
      category: balance,
      sku: "WEMO-BALANCE-001",
      ageMin: 4,
      ageMax: 12,
      names: { "en-US": "Balance Board", "zh-CN": "儿童平衡板" },
      descriptions: {
        "en-US": "Kids balance training board",
        "zh-CN": "儿童平衡训练板",
      },
      prices: [
        { market: "US", currency: "USD", amountMinor: 7999, priceType: "retail" },
        { market: "CN", currency: "CNY", amountMinor: 59900, priceType: "retail" },
      ],
    },
  ];

  const marketByCode = new Map([
    [us.code, us],
    [cn.code, cn],
  ]);

  let created = 0;
  for (const product of products) {
    // 变体 SKU 是产品唯一标识 已存在则整体跳过
    const existingVariant = await database.variant.findFirst({
      where: { sku: `${product.sku}-VAR` },
    });
    if (existingVariant) continue;

    const createdProduct = await database.product.create({
      data: {
        primaryCategoryId: product.category.id,
        status: "active",
        ageMin: product.ageMin,
        ageMax: product.ageMax,
        attributes: { skills: ["coordination"], play_environment: ["indoor"] },
        marketVisibility: { markets: ["US", "CN"] },
        publishedAt: new Date(),
      },
    });

    for (const [marketCode] of marketByCode) {
      const locale = marketCode === "US" ? "en-US" : "zh-CN";
      await database.productTranslation.create({
        data: {
          productId: createdProduct.id,
          locale,
          market: marketCode,
          slug: `${product.sku.toLowerCase()}-${marketCode.toLowerCase()}`,
          name: product.names[locale] ?? product.names["en-US"]!,
          shortDescription: product.descriptions[locale] ?? product.descriptions["en-US"]!,
          content: {
            long_description: product.descriptions[locale] ?? "",
            features: ["Durable material", "Family fun", "Easy storage"],
            included_items: ["Main unit", "Instruction manual"],
            safety_notes: "Adult supervision recommended",
          },
          translationStatus: "published",
        },
      });
    }

    const variant = await database.variant.create({
      data: {
        productId: createdProduct.id,
        sku: `${product.sku}-VAR`,
        barcode: `B${createdProduct.id}0001`,
        options: { default: true },
        specifications: { weight: "2.5kg", dimensions: "40x20x10cm" },
        status: "active",
      },
    });

    for (const price of product.prices) {
      await database.price.create({
        data: {
          variantId: variant.id,
          market: price.market,
          currency: price.currency,
          priceType: price.priceType,
          amountMinor: price.amountMinor,
          minQuantity: 1,
          rules: {},
        },
      });
    }

    await database.inventoryBalance.create({
      data: {
        variantId: variant.id,
        warehouseCode: "MAIN",
        market: "US",
        onHand: 100,
        available: 100,
        reserved: 0,
        source: "manual",
      },
    });
    created += 1;
  }

  // B2B 价格表与经销商价格（价格表按 code 判断）
  const existingPriceList = await database.priceList.findFirst({
    where: { code: "DEALER-2026" },
  });
  if (!existingPriceList) {
    const priceList = await database.priceList.create({
      data: {
        code: "DEALER-2026",
        name: "Dealer Price List 2026",
        market: "US",
        currency: "USD",
        status: "active",
      },
    });
    const company = await database.dealerCompany.findFirst();
    const firstVariant = await database.variant.findFirst();
    if (company && firstVariant) {
      await database.price.create({
        data: {
          variantId: firstVariant.id,
          priceListId: priceList.id,
          dealerCompanyId: company.id,
          market: "US",
          currency: "USD",
          priceType: "dealer",
          amountMinor: 3999,
          minQuantity: 10,
          rules: { tier: "volume" },
        },
      });
    }
  }

  console.log(
    `  ✓ 创建 ${created} 个产品（含变体/价格/库存，跳过 ${products.length - created}）`,
  );
}

async function seedContent() {
  console.log(" seeding content...");

  const entries = [
    {
      type: "page",
      slug: "about",
      title: "About WEMOVE SPORTS",
      body: {
        modules: [
          {
            type: "hero",
            title: "Move together, grow together",
            text: "Family sports equipment for every age.",
          },
        ],
      },
    },
    {
      type: "navigation",
      slug: "main-nav",
      title: "Main Navigation",
      body: {
        items: [
          { label: "Products", url: "/en-us/products" },
          { label: "Dealers", url: "/en-us/dealers" },
          { label: "About", url: "/en-us/about" },
        ],
      },
    },
  ];

  let created = 0;
  for (const entry of entries) {
    const existing = await database.contentEntry.findFirst({
      where: { type: entry.type, slug: entry.slug },
    });
    if (existing) continue;
    await database.contentEntry.create({
      data: {
        type: entry.type,
        locale: "en-US",
        market: "US",
        slug: entry.slug,
        title: entry.title,
        body: entry.body,
        seo:
          entry.type === "page"
            ? { title: "About Us", description: "WEMOVE SPORTS official site" }
            : {},
        status: "published",
        publishedAt: new Date(),
      },
    });
    created += 1;
  }

  const existingRedirect = await database.redirect.findFirst({
    where: { sourcePath: "/old-home" },
  });
  let redirectCreated = 0;
  if (!existingRedirect) {
    await database.redirect.create({
      data: { sourcePath: "/old-home", targetPath: "/en-us/", statusCode: 301 },
    });
    redirectCreated = 1;
  }

  console.log(`  ✓ 创建 ${created} 个内容页 + ${redirectCreated} 个重定向（跳过已存在）`);
}

async function seedSettings() {
  console.log(" seeding settings...");

  const settings = [
    { groupName: "platform", key: "site_name", value: "WEMOVE SPORTS" },
    { groupName: "platform", key: "default_market", value: "US" },
    { groupName: "platform", key: "default_locale", value: "en-US" },
    // 内部收件组 需求 19.2 后台可配置
    {
      groupName: "notification_groups",
      key: "order",
      value: ["orders@wemovetoy.com"],
    },
    {
      groupName: "notification_groups",
      key: "quote",
      value: ["sales@wemovetoy.com"],
    },
    {
      groupName: "notification_groups",
      key: "dealer",
      value: ["dealer@wemovetoy.com"],
    },
    {
      groupName: "notification_groups",
      key: "contact",
      value: ["support@wemovetoy.com"],
    },
  ];

  let created = 0;
  for (const setting of settings) {
    const existing = await database.systemSetting.findFirst({
      where: { groupName: setting.groupName, key: setting.key },
    });
    if (existing) continue;
    await database.systemSetting.create({
      data: {
        groupName: setting.groupName,
        key: setting.key,
        value: setting.value as never,
        version: "1",
        updatedBy: 1,
      },
    });
    created += 1;
  }

  console.log(`  ✓ 创建 ${created} 个系统设置（跳过 ${settings.length - created}）`);
}

/** 事务邮件模板 需求 19.1 六类模板 变量与业务事件载荷对齐 */
async function seedNotificationTemplates() {
  console.log(" seeding notification templates...");

  const templates = [
    {
      code: "account_email_verification",
      audience: "user",
      category: "account",
      subject: "Verify your WEMOVE email",
      body: "Your verification code: {{token}}",
      variables: ["email", "token"],
    },
    {
      code: "account_password_reset",
      audience: "user",
      category: "account",
      subject: "Reset your WEMOVE password",
      body: "Your reset code: {{token}}",
      variables: ["email", "token"],
    },
    {
      code: "account_mfa_challenge",
      audience: "staff",
      category: "account",
      subject: "WEMOVE 后台登录验证码",
      body: "验证码: {{code}}",
      variables: ["email", "code"],
    },
    {
      code: "dealer_application_submitted",
      audience: "dealer",
      category: "dealer",
      subject: "Dealer application submitted",
      body: "申请编号: {{application_no}}",
      variables: ["application_no"],
    },
    {
      code: "dealer_application_reviewed",
      audience: "dealer",
      category: "dealer",
      subject: "Dealer application reviewed",
      body: "申请编号 {{application_no}} 状态 {{status}}",
      variables: ["application_no", "status"],
    },
    {
      code: "quote_requested",
      audience: "dealer",
      category: "quote",
      subject: "Quote requested",
      body: "报价编号: {{quote_id}}",
      variables: ["quote_id"],
    },
    {
      code: "quote_reviewed",
      audience: "dealer",
      category: "quote",
      subject: "Quote reviewed",
      body: "报价 {{quote_id}} 状态 {{status}}",
      variables: ["quote_id", "status"],
    },
    {
      code: "quote_accepted",
      audience: "dealer",
      category: "quote",
      subject: "Quote accepted",
      body: "报价 {{quote_id}} 已接受",
      variables: ["quote_id"],
    },
    {
      code: "order_confirmation",
      audience: "user",
      category: "order",
      subject: "Order confirmation",
      body: "订单 {{order_no}} 状态 {{status}}",
      variables: ["order_no", "status"],
    },
    {
      code: "order_pending_review",
      audience: "dealer",
      category: "order",
      subject: "Order pending review",
      body: "订单 {{order_no}} 待审核",
      variables: ["order_no", "status"],
    },
    {
      code: "return_requested",
      audience: "user",
      category: "order",
      subject: "Return requested",
      body: "售后编号: {{return_id}}",
      variables: ["return_id"],
    },
    {
      code: "contact_submission",
      audience: "user",
      category: "contact",
      subject: "We received your message",
      body: "工单编号: {{submission_no}}",
      variables: ["submission_no"],
    },
  ];

  const existingRaw = await redis.hgetall(NOTIFICATION_TEMPLATES_KEY);
  const existingCodes = new Set(
    Object.values(existingRaw)
      .map((raw) => {
        try {
          return (JSON.parse(raw) as { code?: string }).code;
        } catch {
          return undefined;
        }
      })
      .filter((code): code is string => typeof code === "string"),
  );

  let created = 0;
  const now = new Date().toISOString();
  for (const template of templates) {
    if (existingCodes.has(template.code)) continue;
    const id = await redis.incr("wemo:notifications:templates:next");
    await redis.hset(
      NOTIFICATION_TEMPLATES_KEY,
      String(id),
      JSON.stringify({
        id,
        code: template.code,
        audience: template.audience,
        channel: "email",
        locale: "en-US",
        subject: template.subject,
        body: template.body,
        variables: template.variables,
        category: template.category,
        active: true,
        created_at: now,
        updated_at: now,
      }),
    );
    created += 1;
  }

  console.log(
    `  ✓ 创建 ${created} 个通知模板（跳过 ${templates.length - created}）`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await database.$disconnect();
    await redis.quit();
  });
