import { createHash, randomUUID } from "node:crypto";
import { fastifyJwt } from "@fastify/jwt";
import type { FastifyInstance } from "fastify";
import { env } from "@/env";

export const ACCESS_TOKEN_TTL = "10m";
export const REFRESH_TOKEN_TTL = "7d";
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface AccessTokenClaims {
  sub: string;
  tokenType: "access";
  exp: number;
}

export interface RefreshTokenClaims {
  sub: string;
  jti: string;
  sessionId: string;
  tokenType: "refresh";
  exp: number;
}

export interface IssuedRefreshToken {
  token: string;
  jti: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface IssuedTokenPair {
  accessToken: string;
  refreshToken: IssuedRefreshToken;
}

export interface AuthTokenService {
  createSessionId(): string;
  issueAccessToken(userId: string): string;
  issueRefreshToken(userId: string, sessionId: string): IssuedRefreshToken;
  issueTokenPair(userId: string, sessionId: string): IssuedTokenPair;
  verifyRefreshToken(token: string): RefreshTokenClaims | null;
  hashRefreshToken(token: string): string;
}

export function registerAuthTokenPlugins(app: FastifyInstance) {
  app.register(fastifyJwt, {
    namespace: "access",
    secret: env.JWT_SECRET,
    sign: { expiresIn: ACCESS_TOKEN_TTL },
  });
  app.register(fastifyJwt, {
    namespace: "refresh",
    secret: env.REFRESH_TOKEN_SECRET,
    sign: { expiresIn: REFRESH_TOKEN_TTL },
  });
}

export class FastifyAuthTokenService implements AuthTokenService {
  constructor(private readonly app: FastifyInstance) {}

  createSessionId() {
    return randomUUID();
  }

  issueAccessToken(userId: string) {
    return this.app.jwt.access.sign(
      { tokenType: "access" },
      { sub: userId, expiresIn: ACCESS_TOKEN_TTL },
    );
  }

  issueRefreshToken(userId: string, sessionId: string): IssuedRefreshToken {
    const jti = randomUUID();
    const token = this.app.jwt.refresh.sign(
      { tokenType: "refresh", sessionId },
      { sub: userId, jti, expiresIn: REFRESH_TOKEN_TTL },
    );
    const claims = this.app.jwt.refresh.verify<RefreshTokenClaims>(token);

    return {
      token,
      jti,
      tokenHash: this.hashRefreshToken(token),
      expiresAt: new Date(claims.exp * 1000),
    };
  }

  issueTokenPair(userId: string, sessionId: string): IssuedTokenPair {
    return {
      accessToken: this.issueAccessToken(userId),
      refreshToken: this.issueRefreshToken(userId, sessionId),
    };
  }

  verifyRefreshToken(token: string): RefreshTokenClaims | null {
    try {
      const claims = this.app.jwt.refresh.verify<RefreshTokenClaims>(token);
      if (
        claims.tokenType !== "refresh" ||
        typeof claims.sub !== "string" ||
        typeof claims.jti !== "string" ||
        typeof claims.sessionId !== "string" ||
        typeof claims.exp !== "number"
      ) {
        return null;
      }
      return claims;
    } catch {
      return null;
    }
  }

  hashRefreshToken(token: string) {
    return createHash("sha256").update(token, "utf8").digest("hex");
  }
}
