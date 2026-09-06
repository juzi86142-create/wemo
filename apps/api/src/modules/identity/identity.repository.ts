import type { IdentityAddress, IdentityDataRequest, IdentityNotification, IdentityProfileUpdate, IdentityRole, IdentitySubscription, IdentityUser, IdentityUserListQuery, Pagination } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const IDENTITY_REPOSITORY = Symbol("IDENTITY_REPOSITORY");

export interface IdentityRepository {
  getUserById(id: number): Promise<IdentityUser | null>;
  updateProfile(userId: number, input: IdentityProfileUpdate): Promise<IdentityUser>;
  listAddresses(userId: number): Promise<IdentityAddress[]>;
  upsertAddress(userId: number, input: any): Promise<IdentityAddress>;
  deleteAddress(userId: number, addressId: number): Promise<void>;
  listSubscriptions(userId: number): Promise<IdentitySubscription[]>;
  upsertSubscription(userId: number, input: any): Promise<IdentitySubscription>;
  listUsers(query: IdentityUserListQuery): Promise<{ items: IdentityUser[]; total: number; page: number; page_size: number }>;
  getUserByEmail(email: string): Promise<IdentityUser | null>;
  updateUserStatus(userId: number, status: string): Promise<IdentityUser>;
  assignRole(userId: number, roleId: number): Promise<void>;
  listRoles(): Promise<IdentityRole[]>;
  createRole(input: { code: string; name: string; audience: string; permissions: string[] }): Promise<IdentityRole>;
  updateRole(roleId: number, input: { name?: string; permissions?: string[] }): Promise<IdentityRole>;
  deleteRole(roleId: number): Promise<void>;
  listPermissions(): Promise<string[]>;
  createDataRequest(userId: number, input: { type: string }): Promise<IdentityDataRequest>;
  listDataRequests(userId: number): Promise<IdentityDataRequest[]>;
  getDealerContextForUser(userId: number): Promise<{ company_id: number } | null>;
  listNotifications(query: { user_id: number; page: number; page_size: number }): Promise<{ items: IdentityNotification[]; total: number }>;
}
