import fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hash } from "bcryptjs";
import {
  FastifyAuthTokenService,
  registerAuthTokenPlugins,
} from "@/lib/auth-tokens";
import { InMemoryRefreshSessionsRepository } from "@/repositories/in-memory/in-memory-refresh-sessions-repository";
import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repository";
import { RefreshTokenUnauthorizedError } from "@/use-cases/errors/refresh-token-unauthorized-error";
import { AuthenticateUserUseCase } from "../users/authenticate";
import { LoginUseCase } from "../users/login";
import { LogoutUseCase } from "../users/logout";
import { RefreshSessionUseCase } from "../users/refresh-session";

let tokenApp: FastifyInstance;
let usersRepository: InMemoryUsersRepository;
let sessionsRepository: InMemoryRefreshSessionsRepository;
let tokenService: FastifyAuthTokenService;
let loginUseCase: LoginUseCase;
let refreshUseCase: RefreshSessionUseCase;
let logoutUseCase: LogoutUseCase;

beforeAll(async () => {
  tokenApp = fastify();
  registerAuthTokenPlugins(tokenApp);
  await tokenApp.ready();
});

afterAll(async () => {
  await tokenApp.close();
});

beforeEach(() => {
  usersRepository = new InMemoryUsersRepository();
  sessionsRepository = new InMemoryRefreshSessionsRepository(usersRepository);
  tokenService = new FastifyAuthTokenService(tokenApp);
  loginUseCase = new LoginUseCase(
    new AuthenticateUserUseCase(usersRepository),
    sessionsRepository,
    tokenService,
  );
  refreshUseCase = new RefreshSessionUseCase(
    sessionsRepository,
    tokenService,
  );
  logoutUseCase = new LogoutUseCase(sessionsRepository, tokenService);
});

async function login() {
  await usersRepository.create({
    name: "John Doe",
    email: "john.doe@example.com",
    passwordHash: await hash("password123", 6),
  });
  return loginUseCase.execute({
    email: "john.doe@example.com",
    password: "password123",
  });
}

describe("Refresh sessions", () => {
  it("should issue purpose-bound access and refresh tokens on login", async () => {
    const tokens = await login();
    const accessClaims = tokenApp.jwt.access.verify(tokens.accessToken);
    const refreshClaims = tokenApp.jwt.refresh.verify(tokens.refreshToken);

    expect(accessClaims).toMatchObject({ tokenType: "access" });
    expect(refreshClaims).toMatchObject({
      tokenType: "refresh",
      jti: expect.any(String),
      sessionId: expect.any(String),
    });
    expect(sessionsRepository.tokens[0]?.tokenHash).not.toEqual(
      tokens.refreshToken,
    );
    expect(JSON.stringify(sessionsRepository)).not.toContain(
      tokens.refreshToken,
    );
  });

  it("should reject missing, invalid, expired and wrong-purpose tokens", async () => {
    const userId = "user-1";
    const sessionId = tokenService.createSessionId();
    const accessToken = tokenService.issueAccessToken(userId);
    const expiredToken = tokenApp.jwt.refresh.sign(
      { tokenType: "refresh", sessionId },
      { sub: userId, jti: "expired-jti", expiresIn: "-1s" },
    );
    const wrongPurposeToken = tokenApp.jwt.refresh.sign(
      { tokenType: "access", sessionId },
      { sub: userId, jti: "wrong-purpose-jti", expiresIn: "7d" },
    );

    for (const token of [
      undefined,
      "not-a-token",
      accessToken,
      expiredToken,
      wrongPurposeToken,
    ]) {
      await expect(refreshUseCase.execute(token)).rejects.toBeInstanceOf(
        RefreshTokenUnauthorizedError,
      );
    }
  });

  it("should rotate a refresh token and invalidate the previous token", async () => {
    const initialTokens = await login();
    const rotatedTokens = await refreshUseCase.execute(
      initialTokens.refreshToken,
    );

    expect(rotatedTokens.refreshToken).not.toEqual(initialTokens.refreshToken);
    expect(sessionsRepository.tokens[0]).toMatchObject({
      revokedAt: expect.any(Date),
      replacedByJti: expect.any(String),
    });
    expect(sessionsRepository.tokens).toHaveLength(2);
  });

  it("should revoke the whole family when a rotated token is replayed", async () => {
    const initialTokens = await login();
    const rotatedTokens = await refreshUseCase.execute(
      initialTokens.refreshToken,
    );

    await expect(
      refreshUseCase.execute(initialTokens.refreshToken),
    ).rejects.toBeInstanceOf(RefreshTokenUnauthorizedError);
    await expect(
      refreshUseCase.execute(rotatedTokens.refreshToken),
    ).rejects.toBeInstanceOf(RefreshTokenUnauthorizedError);
    expect(sessionsRepository.sessions[0]?.revokedAt).toEqual(
      expect.any(Date),
    );
  });

  it("should reject refresh for an inactive user and revoke the session", async () => {
    const tokens = await login();
    usersRepository.users[0]!.isActive = false;

    await expect(
      refreshUseCase.execute(tokens.refreshToken),
    ).rejects.toBeInstanceOf(RefreshTokenUnauthorizedError);
    expect(sessionsRepository.sessions[0]?.revokedAt).toEqual(
      expect.any(Date),
    );
  });

  it("should allow only one concurrent rotation", async () => {
    const tokens = await login();
    const results = await Promise.allSettled([
      refreshUseCase.execute(tokens.refreshToken),
      refreshUseCase.execute(tokens.refreshToken),
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === "rejected")).toHaveLength(
      1,
    );
  });

  it("should revoke logout sessions idempotently", async () => {
    const tokens = await login();

    await logoutUseCase.execute(tokens.refreshToken);
    await logoutUseCase.execute(tokens.refreshToken);
    await logoutUseCase.execute(undefined);
    await logoutUseCase.execute("invalid-token");

    expect(sessionsRepository.sessions[0]?.revokedAt).toEqual(
      expect.any(Date),
    );
    expect(sessionsRepository.tokens[0]?.revokedAt).toEqual(expect.any(Date));
  });
});
