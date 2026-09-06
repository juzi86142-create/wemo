import { createDatabase } from "@wemo/database";

const database = createDatabase();

async function main() {
  console.log("开始 seeding 数据库（演示数据）...");

  await cleanDatabase();
  await seedLanguages();
  await seedMarkets();
  await seedRoles();
  await seedUsers();
  await seedCategories();
  await seedProducts();
  await seedContent();
  await seedSettings();

  console.log("Seeding 完成！");
}

async function cleanDatabase() {
  console.log("清理现有数据...");

  // 按依赖顺序删除（relationMode=prisma，无物理外键，顺序仅为语义清晰）
  await database.payment.deleteMany();
  await database.shipment.deleteMany();
  await database.orderItem.deleteMany();
  await database.order.deleteMany();
  await database.quoteVersion.deleteMany();
  await database.quote.deleteMany();
  await database.price.deleteMany();
  await database.priceList.deleteMany();
  await database.inventoryBalance.deleteMany();
  await database.variant.deleteMany();
  await database.productTranslation.deleteMany();
  await database.product.deleteMany();
  await database.category.deleteMany();
  await database.formSubmission.deleteMany();
  await database.contentEntry.deleteMany();
  await database.redirect.deleteMany();
  await database.mediaAsset.deleteMany();
  await database.auditLog.deleteMany();
  await database.systemSetting.deleteMany();
  await database.userRole.deleteMany();
  await database.role.deleteMany();
  await database.session.deleteMany();
  await database.user.deleteMany();
  await database.dealerMember.deleteMany();
  await database.dealerApplication.deleteMany();
  await database.dealerCompany.deleteMany();
  await database.marketLocale.deleteMany();
  await database.market.deleteMany();
  await database.language.deleteMany();

  console.log("数据清理完成");
}

async function seedLanguages() {
  console.log(" seeding languages...");

  const languages = [
    { code: "en", label: "English", nativeLabel: "English" },
    { code: "zh", label: "Chinese", nativeLabel: "中文" },
  ];

  for (const language of languages) {
    await database.language.create({
      data: { ...language, status: "active" },
    });
  }

  console.log(`  ✓ 创建了 ${languages.length} 种语言`);
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

  for (const market of markets) {
    const created = await database.market.create({
      data: {
        code: market.code,
        defaultLocale: market.locales.find((locale) => locale.isDefault)!.locale,
        currency: market.currency,
        timezone: market.timezone,
        settings: { fallback_policy: market.fallbackPolicy },
        status: "active",
      },
    });

    await database.marketLocale.createMany({
      data: market.locales.map((locale, index) => ({
        marketId: created.id,
        languageId: locale.language.id,
        locale: locale.locale,
        pathPrefix: locale.pathPrefix,
        isDefault: locale.isDefault,
        sortOrder: index,
        status: "active",
      })),
    });
  }

  console.log(`  ✓ 创建了 ${markets.length} 个市场`);
}

async function seedRoles() {
  console.log(" seeding roles...");

  const roles = [
    { code: "admin", name: "Administrator", audience: "staff" },
    { code: "customer", name: "Customer", audience: "user" },
    { code: "dealer", name: "Dealer", audience: "dealer" },
  ];

  for (const role of roles) {
    await database.role.create({ data: role });
  }

  console.log(`  ✓ 创建了 ${roles.length} 个角色`);
}

async function seedUsers() {
  console.log(" seeding users...");

  const users = [
    {
      email: "admin@wemove.com",
      passwordHash: "$2a$10$dummy.hash.for.demo",
      name: "Admin User",
      audience: "staff",
      status: "active",
    },
    {
      email: "user@example.com",
      passwordHash: "$2a$10$dummy.hash.for.demo",
      name: "Demo User",
      audience: "user",
      status: "active",
    },
  ];

  for (const user of users) {
    const created = await database.user.create({
      data: {
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        audience: user.audience,
        status: user.status,
        verifiedAt: new Date(),
      },
    });

    const role = await database.role.findFirst({
      where: { audience: user.audience },
    });
    if (role) {
      await database.userRole.create({
        data: { userId: created.id, roleId: role.id, overrides: {} },
      });
    }
  }

  // 演示经销商：公司 + 成员
  const dealerUser = await database.user.create({
    data: {
      email: "dealer@example.com",
      passwordHash: "$2a$10$dummy.hash.for.demo",
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
      terms: { payment_terms: "net30" },
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

  console.log(`  ✓ 创建了 ${users.length} 个用户 + 1 个经销商账号`);
}

async function seedCategories() {
  console.log(" seeding categories...");

  const categories = [
    { slug: "bowling", sortOrder: 1 },
    { slug: "balance-board", sortOrder: 2 },
    { slug: "sports-games", sortOrder: 3 },
  ];

  for (const category of categories) {
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
  }

  console.log(`  ✓ 创建了 ${categories.length} 个分类`);
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

  for (const product of products) {
    const created = await database.product.create({
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

    // 每语言/市场一条翻译（slug 唯一）
    for (const [marketCode, market] of marketByCode) {
      const locale = marketCode === "US" ? "en-US" : "zh-CN";
      await database.productTranslation.create({
        data: {
          productId: created.id,
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
        productId: created.id,
        sku: `${product.sku}-VAR`,
        barcode: `B${created.id}0001`,
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
  }

  // B2B 价格表与经销商价格
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

  console.log(`  ✓ 创建了 ${products.length} 个产品（含变体/价格/库存）`);
}

async function seedContent() {
  console.log(" seeding content...");

  await database.contentEntry.create({
    data: {
      type: "page",
      locale: "en-US",
      market: "US",
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
      seo: { title: "About Us", description: "WEMOVE SPORTS official site" },
      status: "published",
      publishedAt: new Date(),
    },
  });

  await database.contentEntry.create({
    data: {
      type: "navigation",
      locale: "en-US",
      market: "US",
      slug: "main-nav",
      title: "Main Navigation",
      body: {
        items: [
          { label: "Products", url: "/en-us/products" },
          { label: "Dealers", url: "/en-us/dealers" },
          { label: "About", url: "/en-us/about" },
        ],
      },
      seo: {},
      status: "published",
      publishedAt: new Date(),
    },
  });

  await database.redirect.create({
    data: { sourcePath: "/old-home", targetPath: "/en-us/", statusCode: 301 },
  });

  console.log("  ✓ 创建了内容页、导航和重定向");
}

async function seedSettings() {
  console.log(" seeding settings...");

  const settings = [
    { groupName: "platform", key: "site_name", value: "WEMOVE SPORTS" },
    { groupName: "platform", key: "default_market", value: "US" },
    { groupName: "platform", key: "default_locale", value: "en-US" },
  ];

  for (const setting of settings) {
    await database.systemSetting.create({
      data: {
        groupName: setting.groupName,
        key: setting.key,
        value: setting.value,
        version: "1",
        updatedBy: 1,
      },
    });
  }

  console.log(`  ✓ 创建了 ${settings.length} 个系统设置`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await database.$disconnect();
  });
