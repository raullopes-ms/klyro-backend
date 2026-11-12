import type { AuthTokenService } from "@/lib/auth-tokens";
import type { RefreshSessionsRepository } from "@/repositories/refresh-sessions-repository";

export class LogoutUseCase {
  constructor(
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
    private readonly tokenService: AuthTokenService,
  ) {}

  async execute(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }

    const claims = this.tokenService.verifyRefreshToken(rawRefreshToken);
    if (!claims) {
      return;
    }

    await this.refreshSessionsRepository.revokeSession(
      claims.sessionId,
      claims.sub,
    );
  }
}
