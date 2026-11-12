import type { FastifyReply, FastifyRequest } from "fastify";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  clearRefreshTokenCookie,
} from "@/http/cookies/refresh-token-cookie";
import { makeLogoutUseCase } from "@/use-cases/factories/make-logout-use-case";
import type { LogoutUseCase } from "@/use-cases/users/logout";

type LogoutUseCaseFactory = (request: FastifyRequest) => LogoutUseCase;

export function createLogoutController(
  resolveUseCase: LogoutUseCaseFactory = (request) =>
    makeLogoutUseCase(request.server),
) {
  return async function logout(request: FastifyRequest, reply: FastifyReply) {
    const logoutUseCase = resolveUseCase(request);
    try {
      await logoutUseCase.execute(request.cookies[REFRESH_TOKEN_COOKIE_NAME]);
    } finally {
      clearRefreshTokenCookie(reply);
    }
    return reply.status(204).send();
  };
}

export const logout = createLogoutController();
