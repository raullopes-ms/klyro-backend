import type { UsersRepository } from "@/repositories/users-repository";
import { AppError } from "@/use-cases/errors/app-error";
import { ResourceNotFoundError } from "@/use-cases/errors/resource-not-found-error";

interface InactivateUserUseCaseRequest {
  id: string;
  userId: string;
}
interface InactivateUserUseCaseResponse {
  user: {
    isActive: boolean;
  }
}
export class InactivateUserUseCase {
  constructor(private readonly userRepository: UsersRepository) {}
  async execute({ id, userId }: InactivateUserUseCaseRequest): Promise<InactivateUserUseCaseResponse> {
    if (id !== userId) {
      throw new AppError("You can only inactivate your own user");
    }
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new ResourceNotFoundError();
    }
    const inactivatedUser = await this.userRepository.inactivateUser(id);
    return { user: inactivatedUser };
  }
}