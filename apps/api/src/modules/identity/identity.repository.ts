import type {
  AccountStatus,
  DealerContext,
  IdentityAddress,
  IdentityAddressCreateInput,
  IdentityDataRequest,
  IdentityFavorite,
  IdentityNotification,
  IdentityNotificationListQuery,
  IdentityProfileUpdate,
  IdentityRole,
  IdentitySubscription,
  IdentitySubscriptionUpsertInput,
  IdentityUser,
} from "@wemo/contracts";

export const IDENTITY_REPOSITORY = Symbol("IDENTITY_REPOSITORY");

export interface IdentityUserListQuery {
  email?: string;
  status?: string;
  audience?: string;
  page: number;
  page_size: number;
}

export interface IdentityUserListResult {
  items: IdentityUser[];
  total: number;
  page: number;
  page_size: number;
}

export interface IdentityNotificationListResult {
  items: IdentityNotification[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateRoleInput {
  code: string;
  name: string;
  audience: string;
  permissions: string[];
}

export interface UpdateRoleInput {
  name?: string;
  permissions?: string[];
}

export interface CreateDataRequestInput {
  kind: string;
  request_id: string;
  notes: string | null;
}

export interface IdentityRepository {
  getUserById(id: number): Promise<IdentityUser | null>;
  updateProfile(userId: number, input: IdentityProfileUpdate): Promise<IdentityUser>;
  listAddresses(userId: number): Promise<IdentityAddress[]>;
  upsertAddress(userId: number, input: IdentityAddressCreateInput): Promise<IdentityAddress>;
  createAddress(userId: number, input: IdentityAddressCreateInput): Promise<IdentityAddress>;
  updateAddress(
    userId: number,
    addressId: number,
    input: IdentityAddressCreateInput,
  ): Promise<IdentityAddress | null>;
  deleteAddress(userId: number, addressId: number): Promise<void>;
  listSubscriptions(userId: number): Promise<IdentitySubscription[]>;
  upsertSubscription(
    userId: number,
    input: IdentitySubscriptionUpsertInput,
  ): Promise<IdentitySubscription>;
  listUsers(query: IdentityUserListQuery): Promise<IdentityUserListResult>;
  getUserByEmail(email: string): Promise<IdentityUser | null>;
  updateUserStatus(userId: number, status: AccountStatus): Promise<IdentityUser>;
  assignRole(userId: number, roleId: number): Promise<void>;
  listRoles(): Promise<IdentityRole[]>;
  createRole(input: CreateRoleInput): Promise<IdentityRole>;
  updateRole(roleId: number, input: UpdateRoleInput): Promise<IdentityRole>;
  deleteRole(roleId: number): Promise<void>;
  listPermissions(): Promise<string[]>;
  createDataRequest(userId: number, input: CreateDataRequestInput): Promise<IdentityDataRequest>;
  listDataRequests(userId: number): Promise<IdentityDataRequest[]>;
  setUserPermissions(userId: number, permissions: string[]): Promise<IdentityRole>;
  getDealerContextForUser(userId: number): Promise<DealerContext | null>;
  listNotifications(
    query: IdentityNotificationListQuery,
  ): Promise<IdentityNotificationListResult>;
  listFavorites(userId: number): Promise<IdentityFavorite[]>;
  addFavorite(userId: number, productId: number): Promise<IdentityFavorite>;
  removeFavorite(userId: number, productId: number): Promise<void>;
  listAllDataRequests(): Promise<IdentityDataRequest[]>;
  updateDataRequestStatus(
    id: number,
    status: IdentityDataRequest["status"],
  ): Promise<IdentityDataRequest | null>;
}
