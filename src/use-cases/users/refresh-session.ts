import type { AuthTokenService } from "@/lib/auth-tokens";
import type { RefreshSessionsRepository } from "@/repositories/refresh-sessions-repository";
import { RefreshTokenUnauthorizedError } from "../errors/refresh-token-unauthorized-error";

interface RefreshSessionUseCaseResponse {
  accessToken: string;
  refreshToken: string;
}

export class RefreshSessionUseCase {
  constructor(
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
    private readonly tokenService: AuthTokenService,
  ) {}

  async execute(
    rawRefreshToken: string | undefined,
  ): Promise<RefreshSessionUseCaseResponse> {
    if (!rawRefreshToken) {
      throw new RefreshTokenUnauthorizedError();
    }

    const claims = this.tokenService.verifyRefreshToken(rawRefreshToken);
    if (!claims) {
      throw new RefreshTokenUnauthorizedError();
    }

    const nextTokens = this.tokenService.issueTokenPair(
      claims.sub,
      claims.sessionId,
    );
    const result = await this.refreshSessionsRepository.rotateToken({
      sessionId: claims.sessionId,
      userId: claims.sub,
      currentJti: claims.jti,
      currentTokenHash: this.tokenService.hashRefreshToken(rawRefreshToken),
      nextToken: {
        jti: nextTokens.refreshToken.jti,
        tokenHash: nextTokens.refreshToken.tokenHash,
        expiresAt: nextTokens.refreshToken.expiresAt,
      },
    });

    if (result !== "rotated") {
      throw new RefreshTokenUnauthorizedError();
    }

    return {
      accessToken: nextTokens.accessToken,
      refreshToken: nextTokens.refreshToken.token,
    };
  }
}
