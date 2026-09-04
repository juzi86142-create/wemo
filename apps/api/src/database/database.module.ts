import { Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { createDatabase, type DatabaseClient } from "@wemo/database";

import { DATABASE_CLIENT } from "./database.constants";

class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
  ) {}

  async onApplicationShutdown() {
    await this.database.$disconnect();
  }
}

@Module({
  providers: [
    { provide: DATABASE_CLIENT, useFactory: createDatabase },
    DatabaseLifecycle,
  ],
  exports: [DATABASE_CLIENT],
})
export class DatabaseModule {}
