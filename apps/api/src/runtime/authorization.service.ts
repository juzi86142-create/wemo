import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { type AccountAudience, type SessionActor } from "@wemo/contracts/identity";

import { RequestContextStore } from "./request-context.store";

@Injectable()
export class AuthorizationService {
  constructor(
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  requireActor(): SessionActor {
    const actor = this.requestContext.getActor();
    if (!actor) {
      throw new UnauthorizedException("缺少认证上下文");
    }
    return actor;
  }

  requireAudience(...allowed: AccountAudience[]): SessionActor {
    const actor = this.requireActor();
    if (!allowed.includes(actor.audience)) {
      throw new ForbiddenException("当前身份无权访问此接口");
    }
    return actor;
  }

  requirePermission(permission: string): SessionActor {
    const actor = this.requireActor();
    if (!actor.permissions.includes(permission)) {
      throw new ForbiddenException("缺少必要权限");
    }
    return actor;
  }

  requireStaffPermission(permission: string): SessionActor {
    const actor = this.requireAudience("staff");
    if (!actor.permissions.includes(permission)) {
      throw new ForbiddenException("缺少必要权限");
    }
    return actor;
  }

  requireCompanyId(): number {
    const actor = this.requireActor();
    if (!actor.company_id) {
      throw new ForbiddenException("当前会话没有企业范围");
    }
    return actor.company_id;
  }
}
