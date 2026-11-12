import type { UsersRepository } from "@/repositories/users-repository";
import { ResourceNotFoundError } from "../errors/resource-not-found-error";
import { toPublicUser, type PublicUser } from "../mappers/to-public-user";

interface GetUserProfileUseCaseRequest {
  userId: string;
}
interface GetUserProfileUseCaseResponse {
  user: PublicUser;
}
export class GetUserProfileUseCase {
  constructor(private readonly userRepository: UsersRepository) {}
  async execute({
    userId,
  }: GetUserProfileUseCaseRequest): Promise<GetUserProfileUseCaseResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ResourceNotFoundError();
    }
    return { user: toPublicUser(user) };
  }
}
