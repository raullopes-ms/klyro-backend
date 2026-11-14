import { AppError } from "./app-error";

export class UsersAlreadyExistsError extends AppError {
  constructor() {
    super("Usuário já existe", 409);
    this.name = "UsersAlreadyExistsError";
  }
}