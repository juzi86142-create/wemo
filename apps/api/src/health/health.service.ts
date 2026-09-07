import { Injectable } from "@nestjs/common";

@Injectable()
export class HealthService {
  getHealth() {
    return {
      service: "wemove-api",
      status: "ok" as const,
    };
  }
}
