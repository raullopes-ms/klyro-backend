import type { FastifyInstance } from "fastify";
import { FastifyAuthTokenService } from "@/lib/auth-tokens";
import { PrismaRefreshSessionsRepository } from "@/repositories/prisma/prisma-refresh-sessions-repository";
import { PrismaUsersRepository } from "@/repositories/prisma/prisma-users-repository";
import { AuthenticateUserUseCase } from "../users/authenticate";
import { LoginUseCase } from "../users/login";

export function makeLoginUseCase(app: FastifyInstance) {
  const usersRepository = new PrismaUsersRepository();
  const refreshSessionsRepository = new PrismaRefreshSessionsRepository();
  const tokenService = new FastifyAuthTokenService(app);
  const authenticateUser = new AuthenticateUserUseCase(usersRepository);

  return new LoginUseCase(
    authenticateUser,
    refreshSessionsRepository,
    tokenService,
  );
}
