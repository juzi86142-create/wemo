# 02 身份、用户与经销商

## 目标

交付普通用户、经销商成员和后台员工三类身份体系，以及用户资料、经销商申请审核、企业生命周期、成员权限和 `company_id` 数据隔离闭环。

## 所有权

- API：`auth`、`identity`、`dealers`、`forms`、`notifications`。
- 前端：`public-site/{dealers,dealer-application,forms}`、`account/{identity,profile,security}`、`dealer/{company,team,security}`、`admin/{dealers,users,forms,roles}`，以及对应的 `src/app` 路由叶子。
- 共享包：`contracts/{identity,dealers}`，数据库 `identity/dealers` 领域。
- 需求入口：第 2、5、6、8.1、14.3、16、19 章，附录 A，以及 `DLR-*`、`CT-*`、`USR-*`、`ADM-D-*` 中非交易部分。

## 实施顺序

1. 先稳定 actor、会话受众、权限字符串、企业范围与统一拒绝语义，供另外三条工作流消费。
2. 贯通“注册/验证 -> 经销商申请草稿/提交 -> 后台审核 -> 企业激活 -> 成员登录并读取企业资料”的真实入口。
3. 再实现资料、地址、收藏、订阅、数据导出/删除请求、门店公开、团队邀请、补件、暂停/关闭和通知历史。
4. Forms 负责提交与线索状态，Notifications 负责模板与投递真相；邮件供应商和重试执行分别走 04 的 adapter 与 Jobs。

## 协作面

- 向全部工作流提供服务端解析的 actor、模块+动作授权和不可由客户端覆盖的 `company_id` 范围。
- 向 01 提供公开门店 DTO 与受权媒体上下文，向 03 提供企业状态、目录授权、账期和成员权限查询。
- 消费 04 的统一错误、审计、限流、任务和邮件 adapter；消费 01 的媒体/CMS port 保存资质文件和通知内容引用。

## 完成标准

必须覆盖三类会话隔离、邮箱验证、会话撤销、敏感操作重新认证、模块+动作权限、账号级覆盖、跨企业读取/写入拒绝、申请与企业双状态机、暂停企业限制以及通知变量失败/重试。前端隐藏按钮不能作为授权证据。
