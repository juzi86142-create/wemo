import type {
  AuthLoginInput,
  AuthRegisterInput,
  AuthSession,
  AuthSessionListQuery,
  AuthSessionListResponse,
  AuthSessionMutationResponse,
  AuthVerifyEmailInput,
  IdentityNotificationMutationResponse,
  IdentityUserMutationResponse,
  Pagination,
} from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const AUTH_REPOSITORY = Symbol("AUTH_REPOSITORY");

export interface AuthRepository {
  createUser(input: AuthRegisterInput): Promise<AuthSessionMutationResponse["item"]>;
  getUserByEmail(email: string): Promise<AuthSessionMutationResponse["item"] | null>;
  verifyEmail(input: AuthVerifyEmailInput): Promise<AuthSessionMutationResponse["item"]>;
  authenticate(input: AuthLoginInput): Promise<AuthSessionMutationResponse["item"]>;
  issueSession(userId: number, requestId: string): Promise<AuthSession>;
  listSessions(query: AuthSessionListQuery): Promise<AuthSessionListResponse>;
  getSessionByToken(token: string): Promise<AuthSession | null>;
  revokeSession(token: string): Promise<AuthSession>;
  upsertSubscription(userId: number, input: { channel: string; status: string; consent_at: string }): Promise<void>;
  recordNotification(input: { recipient_user_id: number | null; company_id: number | null; audience: string; kind: string; channel: string; template_key: string; request_id: string; payload: unknown; status: string }): Promise<IdentityNotificationMutationResponse["item"]>;
}
