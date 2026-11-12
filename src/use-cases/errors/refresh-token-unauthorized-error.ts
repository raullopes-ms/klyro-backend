import { AppError } from "./app-error";

export class RefreshTokenUnauthorizedError extends AppError {
  constructor() {
    super("Unauthorized", 401);
    this.name = "RefreshTokenUnauthorizedError";
  }
}
