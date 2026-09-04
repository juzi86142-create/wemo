import { PrismaClient } from "@prisma/client";

export function createDatabase() {
  return new PrismaClient();
}

export type DatabaseClient = ReturnType<typeof createDatabase>;
