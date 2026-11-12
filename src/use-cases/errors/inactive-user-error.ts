import { AppError } from "./app-error";

export class InactiveUserError extends AppError {
  constructor() {
    super("Usuário inativado", 403);
    this.name = "InactiveUserError";
  }
}
