import fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hash } from "bcryptjs";
import {
  FastifyAuthTokenService,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  registerAuthTokenPlugins,
} from "@/lib/auth-tokens";
import {
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from "@/http/cookies/refresh-token-cookie";
import { verifyJwt } from "@/http/middlewares/verify-jwt";
import { AppError } from "@/use-cases/errors/app-error";
import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repository";
import { InMemoryRefreshSessionsRepository } from "@/repositories/in-memory/in-memory-refresh-sessions-repository";
import { AuthenticateUserUseCase } from "@/use-cases/users/authenticate";
import { LoginUseCase } from "@/use-cases/users/login";
import { RefreshSessionUseCase } from "@/use-cases/users/refresh-session";
import { LogoutUseCase } from "@/use-cases/users/logout";
import { createRefreshController } from "./refresh";
import { createLogoutController } from "./logout";

const testApp = fastify();
testApp.register(fastifyCookie);
registerAuthTokenPlugins(testApp);

let tokenService: FastifyAuthTokenService;

beforeAll(async () => {
  testApp.get(
    "/private",
    { onRequest: [verifyJwt] },
    async () => ({ ok: true }),
  );
  testApp.get("/token/set", async (_, reply) => {
    const refreshToken = tokenService.issueRefreshToken("user-1", "session-1");
    setRefreshTokenCookie(reply, refreshToken.token);
    return reply.send({ ok: true });
  });
  testApp.delete("/token/clear", async (_, reply) => {
    clearRefreshTokenCookie(reply);
    return reply.status(204).send();
  });
  await testApp.ready();
  tokenService = new FastifyAuthTokenService(testApp);
});

afterAll(async () => {
  await testApp.close();
});

describe("Authentication HTTP boundaries", () => {
  it("should accept only access tokens from the Bearer header", async () => {
    const accessToken = tokenService.issueAccessToken("user-1");
    const refreshToken = tokenService.issueRefreshToken("user-1", "session-1");

    const validAccess = await testApp.inject({
      method: "GET",
      url: "/private",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const refreshAsAccess = await testApp.inject({
      method: "GET",
      url: "/private",
      headers: { authorization: `Bearer ${refreshToken.token}` },
    });
    const refreshCookieAsAccess = await testApp.inject({
      method: "GET",
      url: "/private",
      headers: { cookie: `refreshToken=${refreshToken.token}` },
    });

    expect(validAccess.statusCode).toBe(200);
    expect(refreshAsAccess.statusCode).toBe(401);
    expect(refreshCookieAsAccess.statusCode).toBe(401);
  });

  it("should issue a scoped secure cookie without leaking it in the body", async () => {
    const response = await testApp.inject({
      method: "GET",
      url: "/token/set",
    });
    const setCookie = response.headers["set-cookie"] as string;

    expect(response.json()).toEqual({ ok: true });
    expect(setCookie).toContain("Path=/token");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    expect(setCookie).toContain(`Max-Age=${REFRESH_TOKEN_MAX_AGE_SECONDS}`);
    expect(response.body).not.toContain("refreshToken");
  });

  it("should clear the refresh cookie idempotently", async () => {
    const response = await testApp.inject({
      method: "DELETE",
      url: "/token/clear",
    });
    const setCookie = response.headers["set-cookie"] as string;

    expect(response.statusCode).toBe(204);
    expect(setCookie).toContain("refreshToken=");
    expect(setCookie).toContain("Path=/token");
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });
});

async function buildSessionHttpContext() {
  const app = fastify();
  app.register(fastifyCookie);
  registerAuthTokenPlugins(app);

  let refreshUseCase!: RefreshSessionUseCase;
  let logoutUseCase!: LogoutUseCase;
  app.patch(
    "/token/refresh",
    createRefreshController(() => refreshUseCase),
  );
  app.delete("/token/logout", createLogoutController(() => logoutUseCase));
  app.setErrorHandler((error, _, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        message: error.message,
      });
    }
    return reply.status(500).send({ message: "Internal Server Error" });
  });
  await app.ready();

  const usersRepository = new InMemoryUsersRepository();
  const sessionsRepository = new InMemoryRefreshSessionsRepository(
    usersRepository,
  );
  const tokens = new FastifyAuthTokenService(app);
  refreshUseCase = new RefreshSessionUseCase(sessionsRepository, tokens);
  logoutUseCase = new LogoutUseCase(sessionsRepository, tokens);
  const loginUseCase = new LoginUseCase(
    new AuthenticateUserUseCase(usersRepository),
    sessionsRepository,
    tokens,
  );
  await usersRepository.create({
    name: "John Doe",
    email: "john.doe@example.com",
    passwordHash: await hash("password123", 6),
  });
  const loginTokens = await loginUseCase.execute({
    email: "john.doe@example.com",
    password: "password123",
  });

  return { app, tokens, sessionsRepository, loginTokens };
}

describe("Refresh and logout HTTP contracts", () => {
  it("should return the same 401 for missing and invalid refresh tokens", async () => {
    const context = await buildSessionHttpContext();
    try {
      const accessToken = context.tokens.issueAccessToken("user-1");
      const wrongPurpose = context.app.jwt.refresh.sign(
        { tokenType: "access", sessionId: "session" },
        { sub: "user-1", jti: "wrong-purpose", expiresIn: "7d" },
      );
      const expired = context.app.jwt.refresh.sign(
        { tokenType: "refresh", sessionId: "session" },
        { sub: "user-1", jti: "expired", expiresIn: "-1s" },
      );
      const cookies = [
        undefined,
        "not-a-token",
        accessToken,
        wrongPurpose,
        expired,
      ];

      for (const token of cookies) {
        const response = await context.app.inject({
          method: "PATCH",
          url: "/token/refresh",
          headers: token ? { cookie: `refreshToken=${token}` } : {},
        });
        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({
          statusCode: 401,
          message: "Unauthorized",
        });
      }
    } finally {
      await context.app.close();
    }
  });

  it("should rotate through the cookie without exposing refresh data", async () => {
    const context = await buildSessionHttpContext();
    try {
      const response = await context.app.inject({
        method: "PATCH",
        url: "/token/refresh",
        headers: {
          cookie: `refreshToken=${context.loginTokens.refreshToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<{ token: string }>();
      expect(context.app.jwt.access.verify(body.token)).toMatchObject({
        tokenType: "access",
      });
      expect(response.body).not.toContain(context.loginTokens.refreshToken);
      expect(response.body).not.toContain(
        context.sessionsRepository.tokens[0]!.tokenHash,
      );
      expect(response.headers["set-cookie"]).toContain("Path=/token");
    } finally {
      await context.app.close();
    }
  });

  it("should revoke and clear logout cookies idempotently", async () => {
    const context = await buildSessionHttpContext();
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await context.app.inject({
          method: "DELETE",
          url: "/token/logout",
          headers: {
            cookie: `refreshToken=${context.loginTokens.refreshToken}`,
          },
        });
        expect(response.statusCode).toBe(204);
        expect(response.headers["set-cookie"]).toContain(
          "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        );
      }
      expect(context.sessionsRepository.sessions[0]?.revokedAt).toEqual(
        expect.any(Date),
      );
    } finally {
      await context.app.close();
    }
  });
});
