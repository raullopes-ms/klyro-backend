import type { FastifyInstance } from "fastify";
import { FastifyAuthTokenService } from "@/lib/auth-tokens";
import { PrismaRefreshSessionsRepository } from "@/repositories/prisma/prisma-refresh-sessions-repository";
import { LogoutUseCase } from "../users/logout";

export function makeLogoutUseCase(app: FastifyInstance) {
  return new LogoutUseCase(
    new PrismaRefreshSessionsRepository(),
    new FastifyAuthTokenService(app),
  );
}
