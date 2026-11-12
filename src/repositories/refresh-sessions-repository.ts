export interface PersistedRefreshTokenInput {
  jti: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CreateRefreshSessionInput {
  sessionId: string;
  userId: string;
  token: PersistedRefreshTokenInput;
}

export interface RotateRefreshTokenInput {
  sessionId: string;
  userId: string;
  currentJti: string;
  currentTokenHash: string;
  nextToken: PersistedRefreshTokenInput;
}

export type RefreshTokenRotationResult =
  | "rotated"
  | "invalid"
  | "inactive"
  | "replayed";

export interface RefreshSessionsRepository {
  createSession(data: CreateRefreshSessionInput): Promise<void>;
  rotateToken(
    data: RotateRefreshTokenInput,
  ): Promise<RefreshTokenRotationResult>;
  revokeSession(sessionId: string, userId: string): Promise<void>;
}
