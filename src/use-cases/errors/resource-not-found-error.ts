import { AppError } from "./app-error";

export class ResourceNotFoundError extends AppError {
  constructor() {
    super("Recurso não encontrado.", 404);
    this.name = "ResourceNotFoundError";
  }
}