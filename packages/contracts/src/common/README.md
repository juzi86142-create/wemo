# Common 契约

- 定义正整数自增实体 ID、分页参数、字段错误和统一 API 错误。
- 列表响应后续统一补充 items、page、page_size、total，不允许各模块自造分页语义。
- 所有重要 API 错误必须包含 `request_id`。
