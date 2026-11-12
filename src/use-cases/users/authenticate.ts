import { InvalidCredentialsError } from "@/use-cases/errors/invalid-credentials-error";
import { InactiveUserError } from "@/use-cases/errors/inactive-user-error";
import type { UsersRepository } from "@/repositories/users-repository";
import {
  toPublicUser,
  type PublicUser,
} from "@/use-cases/mappers/to-public-user";
import { compare } from "bcryptjs";

interface AuthenticateUserUseCaseRequest {
  email: string;
  password: string;
}
interface AuthenticateUserUseCaseResponse {
  user: PublicUser;
}
export class AuthenticateUserUseCase {
  constructor(private readonly userRepository: UsersRepository) {}
  async execute({
    email,
    password,
  }: AuthenticateUserUseCaseRequest): Promise<AuthenticateUserUseCaseResponse> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }
    const isPasswordCorrect = await compare(password, user.passwordHash);
    if (!isPasswordCorrect) {
      throw new InvalidCredentialsError();
    }
    if (!user.isActive) {
      throw new InactiveUserError();
    }
    return {
      user: toPublicUser(user),
    };
  }
}
