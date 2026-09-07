import type {
  AccountAudience,
  AuthLoginInput,
  AuthSession,
  AuthSessionListQuery,
  AuthVerifyEmailInput,
  IdentityUser,
} from "@wemo/contracts";

export const AUTH_REPOSITORY = Symbol("AUTH_REPOSITORY");

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  audience: AccountAudience;
}

export interface AuthSessionListResult {
  items: AuthSession[];
  total: number;
  page: number;
  page_size: number;
}

export interface RevokeOthersResult {
  revoked_count: number;
  remaining: AuthSession[];
}

export interface AuthRepository {
  createUser(input: CreateUserInput): Promise<IdentityUser>;
  getUserByEmail(email: string): Promise<IdentityUser | null>;
  verifyEmail(input: AuthVerifyEmailInput): Promise<IdentityUser>;
  authenticate(input: AuthLoginInput): Promise<IdentityUser>;
  issueSession(userId: number, audience: AccountAudience): Promise<AuthSession>;
  listSessions(
    query: AuthSessionListQuery & { user_id: number },
  ): Promise<AuthSessionListResult>;
  getSessionByToken(token: string): Promise<AuthSession | null>;
  revokeSession(token: string): Promise<AuthSession>;
  revokeOtherSessions(
    userId: number,
    currentToken: string,
  ): Promise<RevokeOthersResult>;
  storeEmailVerificationToken(
    email: string,
    token: string,
    userId: number,
  ): Promise<void>;
  consumeEmailVerificationToken(
    email: string,
    token: string,
  ): Promise<number | null>;
  storePasswordResetToken(
    email: string,
    token: string,
    userId: number,
  ): Promise<void>;
  consumePasswordResetToken(
    email: string,
    token: string,
  ): Promise<number | null>;
  resetPassword(userId: number, newPassword: string): Promise<IdentityUser>;
  changePassword(userId: number, newPassword: string): Promise<IdentityUser>;
  getPasswordHash(userId: number): Promise<string | null>;
  getActiveDealerMembership(
    userId: number,
  ): Promise<{ company_id: number; role: string } | null>;
  upsertSubscription(
    userId: number,
    input: { channel: string; status: string; consent_at: string },
  ): Promise<void>;
}
