import { AppError } from "./app-error";

export class UnauthorizedError extends AppError {
  constructor() {
    super("Unauthorized", 401);
    this.name = "UnauthorizedError";
  }
}
