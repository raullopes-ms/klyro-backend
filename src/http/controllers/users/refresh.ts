import type { FastifyReply, FastifyRequest } from "fastify";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  setRefreshTokenCookie,
} from "@/http/cookies/refresh-token-cookie";
import { makeRefreshSessionUseCase } from "@/use-cases/factories/make-refresh-session-use-case";
import type { RefreshSessionUseCase } from "@/use-cases/users/refresh-session";

type RefreshSessionUseCaseFactory = (
  request: FastifyRequest,
) => RefreshSessionUseCase;

export function createRefreshController(
  resolveUseCase: RefreshSessionUseCaseFactory = (request) =>
    makeRefreshSessionUseCase(request.server),
) {
  return async function refresh(request: FastifyRequest, reply: FastifyReply) {
    const refreshSessionUseCase = resolveUseCase(request);
    const { accessToken, refreshToken } = await refreshSessionUseCase.execute(
      request.cookies[REFRESH_TOKEN_COOKIE_NAME],
    );
    setRefreshTokenCookie(reply, refreshToken);
    return reply.status(200).send({ token: accessToken });
  };
}

export const refresh = createRefreshController();
