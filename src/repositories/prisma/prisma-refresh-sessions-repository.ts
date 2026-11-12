import { prisma } from "@/lib/prisma";
import { safeEqual } from "@/lib/crypto";
import type {
  CreateRefreshSessionInput,
  RefreshSessionsRepository,
  RotateRefreshTokenInput,
} from "../refresh-sessions-repository";

export class PrismaRefreshSessionsRepository
  implements RefreshSessionsRepository
{
  async createSession({
    sessionId,
    userId,
    token,
  }: CreateRefreshSessionInput) {
    await prisma.refreshSession.create({
      data: {
        id: sessionId,
        userId,
        tokens: {
          create: token,
        },
      },
    });
  }

  async rotateToken({
    sessionId,
    userId,
    currentJti,
    currentTokenHash,
    nextToken,
  }: RotateRefreshTokenInput) {
    return prisma.$transaction(async (transaction) => {
      const now = new Date();
      const revokeFamily = async () => {
        await transaction.refreshSession.updateMany({
          where: { id: sessionId, userId, revokedAt: null },
          data: { revokedAt: now },
        });
        await transaction.refreshToken.updateMany({
          where: { sessionId, revokedAt: null },
          data: { revokedAt: now },
        });
      };

      const currentToken = await transaction.refreshToken.findUnique({
        where: { jti: currentJti },
        include: {
          session: {
            include: { user: true },
          },
        },
      });

      if (
        !currentToken ||
        currentToken.sessionId !== sessionId ||
        currentToken.session.userId !== userId ||
        !safeEqual(currentToken.tokenHash, currentTokenHash)
      ) {
        return "invalid" as const;
      }

      if (
        currentToken.revokedAt ||
        currentToken.replacedByJti ||
        currentToken.session.revokedAt
      ) {
        await revokeFamily();
        return "replayed" as const;
      }

      if (currentToken.expiresAt <= now) {
        await revokeFamily();
        return "invalid" as const;
      }

      if (!currentToken.session.user.isActive) {
        await revokeFamily();
        return "inactive" as const;
      }

      const claimedToken = await transaction.refreshToken.updateMany({
        where: {
          id: currentToken.id,
          revokedAt: null,
          replacedByJti: null,
        },
        data: {
          revokedAt: now,
          replacedByJti: nextToken.jti,
        },
      });

      if (claimedToken.count !== 1) {
        await revokeFamily();
        return "replayed" as const;
      }

      await transaction.refreshToken.create({
        data: {
          ...nextToken,
          sessionId,
        },
      });

      return "rotated" as const;
    });
  }

  async revokeSession(sessionId: string, userId: string) {
    await prisma.$transaction(async (transaction) => {
      const now = new Date();
      await transaction.refreshSession.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.refreshToken.updateMany({
        where: {
          sessionId,
          session: { userId },
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
    });
  }
}
