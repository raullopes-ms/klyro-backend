import type { FastifyReply } from "fastify";
import { env } from "@/env";
import { REFRESH_TOKEN_MAX_AGE_SECONDS } from "@/lib/auth-tokens";

export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
export const REFRESH_TOKEN_COOKIE_PATH = "/token";

function baseCookieOptions() {
  return {
    path: REFRESH_TOKEN_COOKIE_PATH,
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
  };
}

export function setRefreshTokenCookie(
  reply: FastifyReply,
  refreshToken: string,
) {
  return reply.setCookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...baseCookieOptions(),
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

export function clearRefreshTokenCookie(reply: FastifyReply) {
  return reply.clearCookie(REFRESH_TOKEN_COOKIE_NAME, baseCookieOptions());
}
