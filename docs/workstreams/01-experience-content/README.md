# 01 体验、商品与内容

## 目标

交付可由运营配置、可被搜索与索引、在首个 HTML 中包含核心信息的公开站：从商品与内容录入、媒体处理和发布，到首页、PLP、PDP、文章、支持、搜索及 SEO 输出形成闭环。

## 所有权

- API：`catalog`、`cms`、`media`、`search`、`seo`、`localization`。
- 前端：`public-site/{home,catalog,content,support,search}`、`admin/{catalog,content,seo}`、`platform/{localization,seo}`，以及对应的 `src/app` 路由叶子。
- 共享包：`contracts/{catalog,content}`、数据库 `catalog/content` 领域、UI `tokens/navigation/content`。
- 需求入口：第 3、4、10、11、12、13 章，以及 `FE-*`、`HOME-*`、`PLP-*`、`PDP-*`、`CNT-*`、`SEA-*`、`SEO-*`。公开经销商与表单流程归 02，本工作流只提供页面装配所需的内容和搜索能力。

## 实施顺序

1. 完成商品、内容、媒体和本地化的 Zod 契约、状态枚举与领域数据模型，明确 public/dealer/admin DTO 的字段差异。
2. 先贯通“后台录入并发布一个商品/页面 -> 公开 SSR 查询 -> metadata/Schema 输出”这一真实链路，再扩展批量、版本、预览、定时和搜索索引。
3. 媒体下载在服务端执行四级权限；公开搜索必须过滤未发布、错误市场和无权资料。
4. 页面覆盖加载、空、失败、移动端、键盘和减少动效；筛选/排序/分页写入 URL。

## 协作面

- 向 03 提供按市场和身份读取 SKU、发布状态、订购约束与商品快照的公开查询 port；价格和库存不写入商品真相。
- 向 02 提供门店页、申请页和通知模板需要的 CMS/媒体 port，不读取经销商私有 repository。
- 消费 04 的 actor/request_id、任务、审计和 adapter 能力；索引、图片处理和 Sitemap 更新通过任务状态可观测。

## 完成标准

至少覆盖后台发布、公开 SSR、预览授权、私有下载拒绝、搜索授权过滤、slug/重定向、缓存/索引失效和多语言回退的真实入口测试。旧站资产只有在品牌确认后才可进入数据或媒体存储。
