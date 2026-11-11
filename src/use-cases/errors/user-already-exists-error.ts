import { AppError } from "./app-error";

export class UsersAlreadyExistsError extends AppError {
  constructor() {
    super("User already exists", 409);
    this.name = "UsersAlreadyExistsError";
  }
}