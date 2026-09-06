import { z } from "zod";

import {
  createItemResponseSchema,
  createListResponseSchema,
  EntityIdSchema,
  JsonValueSchema,
  RequestIdSchema,
} from "../common/index.js";

export const PlatformSettingSchema = z.object({
  id: EntityIdSchema,
  group_name: z.string().min(1),
  key: z.string().min(1),
  value: JsonValueSchema,
  version: z.string().min(1),
  updated_by: EntityIdSchema,
  updated_at: z.string().datetime(),
  is_sensitive: z.boolean().default(false),
});

export const PlatformSettingGroupSchema = z.object({
  group_name: z.string().min(1),
  items: z.array(PlatformSettingSchema),
});

export const PlatformSettingsSnapshotSchema = z.object({
  request_id: RequestIdSchema,
  generated_at: z.string().datetime(),
  groups: z.array(PlatformSettingGroupSchema),
});

export const PlatformSettingUpdateSchema = z.object({
  value: JsonValueSchema,
  expected_version: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
});

export const PlatformSettingMutationSchema = z.object({
  group_name: z.string().min(1),
  key: z.string().min(1),
  value: JsonValueSchema,
  expected_version: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
  is_sensitive: z.boolean().optional(),
});

export const PlatformSettingListResponseSchema = createListResponseSchema(
  PlatformSettingSchema,
);
export const PlatformSettingMutationResponseSchema = createItemResponseSchema(
  PlatformSettingSchema,
);

export type PlatformSetting = z.infer<typeof PlatformSettingSchema>;
export type PlatformSettingGroup = z.infer<typeof PlatformSettingGroupSchema>;
export type PlatformSettingsSnapshot = z.infer<
  typeof PlatformSettingsSnapshotSchema
>;
export type PlatformSettingUpdate = z.infer<typeof PlatformSettingUpdateSchema>;
export type PlatformSettingMutation = z.infer<
  typeof PlatformSettingMutationSchema
>;
