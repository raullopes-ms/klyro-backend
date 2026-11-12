import type { AuthTokenService } from "@/lib/auth-tokens";
import type { RefreshSessionsRepository } from "@/repositories/refresh-sessions-repository";
import type { AuthenticateUserUseCase } from "./authenticate";

interface LoginUseCaseRequest {
  email: string;
  password: string;
}

interface LoginUseCaseResponse {
  accessToken: string;
  refreshToken: string;
}

export class LoginUseCase {
  constructor(
    private readonly authenticateUser: AuthenticateUserUseCase,
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
    private readonly tokenService: AuthTokenService,
  ) {}

  async execute({
    email,
    password,
  }: LoginUseCaseRequest): Promise<LoginUseCaseResponse> {
    const { user } = await this.authenticateUser.execute({ email, password });
    const sessionId = this.tokenService.createSessionId();
    const tokens = this.tokenService.issueTokenPair(user.id, sessionId);

    await this.refreshSessionsRepository.createSession({
      sessionId,
      userId: user.id,
      token: {
        jti: tokens.refreshToken.jti,
        tokenHash: tokens.refreshToken.tokenHash,
        expiresAt: tokens.refreshToken.expiresAt,
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken.token,
    };
  }
}
