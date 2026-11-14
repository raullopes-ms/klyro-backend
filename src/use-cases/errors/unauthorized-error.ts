import { AppError } from "./app-error";

export class UnauthorizedError extends AppError {
  constructor() {
    super("Não autorizado", 401);
    this.name = "UnauthorizedError";
  }
}
