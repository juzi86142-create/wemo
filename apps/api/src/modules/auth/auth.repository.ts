import type {
  AccountAudience,
  AuthLoginInput,
  AuthSession,
  AuthSessionListQuery,
  AuthVerifyEmailInput,
  IdentityNotification,
  IdentityUser,
} from "@wemo/contracts";

export const AUTH_REPOSITORY = Symbol("AUTH_REPOSITORY");

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  audience: AccountAudience;
}

export interface RecordNotificationInput {
  recipient_user_id: number | null;
  company_id: number | null;
  audience: string;
  kind: string;
  channel: string;
  template_key: string;
  request_id: string;
  payload: unknown;
  status: string;
}

export interface AuthSessionListResult {
  items: AuthSession[];
  total: number;
  page: number;
  page_size: number;
}

export interface AuthRepository {
  createUser(input: CreateUserInput): Promise<IdentityUser>;
  getUserByEmail(email: string): Promise<IdentityUser | null>;
  verifyEmail(input: AuthVerifyEmailInput): Promise<IdentityUser>;
  authenticate(input: AuthLoginInput): Promise<IdentityUser>;
  issueSession(userId: number, requestId: string): Promise<AuthSession>;
  listSessions(
    query: AuthSessionListQuery & { user_id: number },
  ): Promise<AuthSessionListResult>;
  getSessionByToken(token: string): Promise<AuthSession | null>;
  revokeSession(token: string): Promise<AuthSession>;
  upsertSubscription(
    userId: number,
    input: { channel: string; status: string; consent_at: string },
  ): Promise<void>;
  recordNotification(input: RecordNotificationInput): Promise<IdentityNotification>;
}
