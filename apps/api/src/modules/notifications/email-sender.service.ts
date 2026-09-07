import { Inject, Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import { createTransport, type Transporter } from "nodemailer";

import { DATABASE_CLIENT } from "../../database/database.constants";

export interface EmailSendResult {
  sent: boolean;
  provider_message_id: string | null;
  failure_reason: string | null;
}

/** 事务邮件发送 本地演示环境经 Mailpit SMTP 实际投递 需求第 19 章 */
@Injectable()
export class EmailSenderService {
  private readonly transport: Transporter;

  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {
    const host = process.env.MAIL_HOST ?? "localhost";
    const port = Number(process.env.MAIL_PORT ?? 1025);
    this.transport = createTransport({
      host,
      port,
      secure: false,
      tls: { rejectUnauthorized: false },
    });
  }

  async lookupEmail(userId: number | null): Promise<string | null> {
    if (userId === null) return null;
    const user = await this.database.user.findUnique({ where: { id: userId } });
    return user?.email ?? null;
  }

  async send(to: string, subject: string, text: string): Promise<EmailSendResult> {
    try {
      const info = await this.transport.sendMail({
        from: process.env.MAIL_FROM ?? "no-reply@wemovetoy.com",
        to,
        subject,
        text,
      });
      return {
        sent: true,
        provider_message_id: info.messageId ?? null,
        failure_reason: null,
      };
    } catch (error) {
      return {
        sent: false,
        provider_message_id: null,
        failure_reason:
          error instanceof Error ? error.message : "邮件发送失败",
      };
    }
  }
}
