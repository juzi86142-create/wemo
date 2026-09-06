import { PrismaClient } from "@prisma/client";

const database = new PrismaClient();

async function main() {
  console.log("开始 seeding 数据库...");

  // 清空现有数据
  await cleanDatabase();

  // 创建基础数据
  await seedLanguages();
  await seedMarkets();
  await seedRoles();
  await seedUsers();
  await seedCategories();
  await seedProducts();
  await seedSettings();

  console.log("Seeding 完成！");
}

async function cleanDatabase() {
  console.log("清理现有数据...");

  // 按依赖顺序删除
  await database.cartItem.deleteMany();
  await database.cart.deleteMany();
  await database.orderItem.deleteMany();
  await database.payment.deleteMany();
  await database.returnRequest.deleteMany();
  await database.quote.deleteMany();
  await database.inventoryReservation.deleteMany();
  await database.inventoryBalance.deleteMany();
  await database.price.deleteMany();
  await database.priceList.deleteMany();
  await database.variant.deleteMany();
  await database.productTranslation.deleteMany();
  await database.product.deleteMany();
  await database.category.deleteMany();
  await database.mediaAsset.deleteMany();
  await database.formSubmission.deleteMany();
  await database.form.deleteMany();
  await database.contentEntry.deleteMany();
  await database.redirect.deleteMany();
  await database.userRole.deleteMany();
  await database.role.deleteMany();
  await database.user.deleteMany();
  await database.subscription.deleteMany();
  await database.session.deleteMany();
  await database.address.deleteMany();
  await database.dealerMember.deleteMany();
  await database.dealerCompany.deleteMany();
  await database.dealerApplication.deleteMany();
  await database.favorite.deleteMany();
  await database.notificationDelivery.deleteMany();
  await database.notificationTemplate.deleteMany();
  await database.analyticsEvent.deleteMany();
  await database.auditLog.deleteMany();
  await database.systemSetting.deleteMany();
  await database.outboxEvent.deleteMany();
  await database.integration.deleteMany();
  await database.jobDefinition.deleteMany();
  await database.jobExecution.deleteMany();
  await database.reportDefinition.deleteMany();
  await database.reportResult.deleteMany();
  await database.dataRequest.deleteMany();
  await database.shipment.deleteMany();
  await database.dealerAddress.deleteMany();
  await database.quoteVersion.deleteMany();

  await database.marketLocale.deleteMany();
  await database.market.deleteMany();
  await database.language.deleteMany();

  console.log("数据清理完成");
}

async function seedLanguages() {
  console.log(" seeding languages...");

  const languages = [
    { code: "en", label: "English", native_label: "English", status: "active" },
    { code: "zh", label: "Chinese", native_label: "中文", status: "active" },
  ];

  for (const lang of languages) {
    await database.language.create({
      data: { code: lang.code, label: lang.label, nativeLabel: lang.native_label, status: lang.status },
    });
  }

  console.log(`  ✓ 创建了 ${languages.length} 种语言`);
}

async function seedMarkets() {
  console.log(" seeding markets...");

  const markets = [
    {
      code: "US",
      currency: "USD",
      timezone: "America/New_York",
      fallbackPolicy: "default_locale",
      status: "active",
      locales: [
        { locale: "en-US", isDefault: true, pathPrefix: "", languageCode: "en" },
      ],
    },
    {
      code: "CN",
      currency: "CNY",
      timezone: "Asia/Shanghai",
      fallbackPolicy: "default_locale",
      status: "active",
      locales: [
        { locale: "zh-CN", isDefault: true, pathPrefix: "zh-cn", languageCode: "zh" },
      ],
    },
  ];

  for (const market of markets) {
    const createdMarket = await database.market.create({
      data: {
        code: market.code,
        currency: market.currency,
        timezone: market.timezone,
        fallbackPolicy: market.fallbackPolicy,
        status: market.status,
        locales: {
          create: market.locales.map((loc) => ({
            locale: loc.locale,
            isDefault: loc.isDefault,
            pathPrefix: loc.pathPrefix,
            language: { connect: { code: loc.languageCode } },
          })),
        },
      },
      include: { locales: { include: { language: true } } },
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
    await database.role.create({
      data: { code: role.code, name: role.name, audience: role.audience },
    });
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
      },
    });

    // 分配角色
    const role = await database.role.findFirst({ where: { audience: user.audience } });
    if (role) {
      await database.userRole.create({
        data: { userId: created.id, roleId: role.id, overrides: {} },
      });
    }
  }

  console.log(`  ✓ 创建了 ${users.length} 个用户`);
}

async function seedCategories() {
  console.log(" seeding categories...");

  const categories = [
    { slug: "bowling", status: "active", sortOrder: 1 },
    { slug: "balance-board", status: "active", sortOrder: 2 },
    { slug: "sports-games", status: "active", sortOrder: 3 },
  ];

  for (const cat of categories) {
    await database.category.create({
      data: {
        slug: cat.slug,
        status: cat.status,
        sortOrder: cat.sortOrder,
        localizedContent: { en: { name: cat.slug }, zh: { name: cat.slug } },
        parentId: null,
      },
    });
  }

  console.log(`  ✓ 创建了 ${categories.length} 个分类`);
}

async function seedProducts() {
  console.log(" seeding products...");

  // 获取分类
  const bowlingCategory = await database.category.findFirst({ where: { slug: "bowling" } });
  if (!bowlingCategory) return;

  const products = [
    {
      sku: "WEMO-BOWL-001",
      name: "Kids Bowling Set",
      description: "Fun bowling set for kids",
      price: 49.99,
      status: "active",
    },
    {
      sku: "WEMO-BALANCE-001",
      name: "Balance Board",
      description: "Kids balance training board",
      price: 79.99,
      status: "active",
    },
  ];

  for (const product of products) {
    const created = await database.product.create({
      data: {
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: product.price,
        status: product.status,
        primaryCategoryId: bowlingCategory.id,
        localizedContent: { en: { name: product.name, description: product.description } },
      },
    });

    // 创建variant
    await database.variant.create({
      data: {
        productId: created.id,
        sku: `${product.sku}-VAR`,
        name: "Default",
        price: product.price,
        inventory: 100,
        status: "active",
      },
    });
  }

  console.log(`  ✓ 创建了 ${products.length} 个产品`);
}

async function seedSettings() {
  console.log(" seeding settings...");

  const settings = [
    { groupName: "platform", key: "site_name", value: "WEMOVE SPORTS" },
    { groupName: "platform", key: "default_market", value: "US" },
    { groupName: "platform", key: "default_locale", value: "en-US" },
  ];

  const usMarket = await database.market.findFirst({ where: { code: "US" } });
  const enUSLocale = usMarket?.locales[0];

  for (const setting of settings) {
    await database.systemSetting.create({
      data: {
        groupName: setting.groupName,
        key: setting.key,
        value: setting.value,
        type: "string",
        isPublic: true,
        marketId: usMarket?.id || 0,
        localeId: enUSLocale?.id || 0,
      },
    });
  }

  console.log(`  ✓ 创建了 ${settings.length} 个系统设置`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await database.$disconnect();
  });
