import { safeEqual } from "@/lib/crypto";
import type {
  CreateRefreshSessionInput,
  RefreshSessionsRepository,
  RotateRefreshTokenInput,
} from "../refresh-sessions-repository";
import type { InMemoryUsersRepository } from "./in-memory-users-repository";

interface InMemoryRefreshSession {
  id: string;
  userId: string;
  revokedAt: Date | null;
}

interface InMemoryRefreshToken {
  sessionId: string;
  jti: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByJti: string | null;
}

export class InMemoryRefreshSessionsRepository
  implements RefreshSessionsRepository
{
  public sessions: InMemoryRefreshSession[] = [];
  public tokens: InMemoryRefreshToken[] = [];

  constructor(private readonly usersRepository: InMemoryUsersRepository) {}

  async createSession({
    sessionId,
    userId,
    token,
  }: CreateRefreshSessionInput) {
    this.sessions.push({ id: sessionId, userId, revokedAt: null });
    this.tokens.push({
      sessionId,
      ...token,
      revokedAt: null,
      replacedByJti: null,
    });
  }

  async rotateToken({
    sessionId,
    userId,
    currentJti,
    currentTokenHash,
    nextToken,
  }: RotateRefreshTokenInput) {
    const session = this.sessions.find(
      (item) => item.id === sessionId && item.userId === userId,
    );
    const currentToken = this.tokens.find(
      (item) => item.jti === currentJti && item.sessionId === sessionId,
    );

    if (
      !session ||
      !currentToken ||
      !safeEqual(currentToken.tokenHash, currentTokenHash)
    ) {
      return "invalid" as const;
    }

    if (
      session.revokedAt ||
      currentToken.revokedAt ||
      currentToken.replacedByJti
    ) {
      this.revokeFamily(sessionId);
      return "replayed" as const;
    }

    const now = new Date();
    if (currentToken.expiresAt <= now) {
      this.revokeFamily(sessionId);
      return "invalid" as const;
    }

    const user = await this.usersRepository.findById(userId);
    if (!user?.isActive) {
      this.revokeFamily(sessionId);
      return "inactive" as const;
    }

    if (currentToken.revokedAt || currentToken.replacedByJti) {
      this.revokeFamily(sessionId);
      return "replayed" as const;
    }

    currentToken.revokedAt = now;
    currentToken.replacedByJti = nextToken.jti;
    this.tokens.push({
      sessionId,
      ...nextToken,
      revokedAt: null,
      replacedByJti: null,
    });
    return "rotated" as const;
  }

  async revokeSession(sessionId: string, userId: string) {
    const session = this.sessions.find(
      (item) => item.id === sessionId && item.userId === userId,
    );
    if (session) {
      this.revokeFamily(sessionId);
    }
  }

  private revokeFamily(sessionId: string) {
    const now = new Date();
    const session = this.sessions.find((item) => item.id === sessionId);
    if (session && !session.revokedAt) {
      session.revokedAt = now;
    }
    for (const token of this.tokens) {
      if (token.sessionId === sessionId && !token.revokedAt) {
        token.revokedAt = now;
      }
    }
  }
}
