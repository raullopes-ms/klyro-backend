import { InvalidCredentialsError } from "@/use-cases/errors/invalid-credentials-error";
import type { UsersRepository } from "@/repositories/users-repository";
import { compare } from "bcryptjs";

interface AuthenticateUserUseCaseRequest {
  email: string;
  password: string;
}
interface AuthenticateUserUseCaseResponse {
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
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
    return {
      user,
    };
  }
}
