import type { FastifyInstance } from "fastify";
import { FastifyAuthTokenService } from "@/lib/auth-tokens";
import { PrismaRefreshSessionsRepository } from "@/repositories/prisma/prisma-refresh-sessions-repository";
import { RefreshSessionUseCase } from "../users/refresh-session";

export function makeRefreshSessionUseCase(app: FastifyInstance) {
  return new RefreshSessionUseCase(
    new PrismaRefreshSessionsRepository(),
    new FastifyAuthTokenService(app),
  );
}
