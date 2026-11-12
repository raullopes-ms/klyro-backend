import { UsersAlreadyExistsError } from "@/use-cases/errors/user-already-exists-error";
import type { UsersRepository } from "@/repositories/users-repository";
import {
  toPublicUser,
  type PublicUser,
} from "@/use-cases/mappers/to-public-user";
import { hash } from "bcryptjs";

interface RegisterUserUseCaseRequest {
  name: string;
  email: string;
  password: string;
}
interface RegisterUserUseCaseResponse {
  user: PublicUser;
}
export class RegisterUserUseCase {
  constructor(private readonly userRepository: UsersRepository) {}
  async execute({
    name,
    email,
    password,
  }: RegisterUserUseCaseRequest): Promise<RegisterUserUseCaseResponse> {
    const userWithSameEmail = await this.userRepository.findByEmail(email);
    if (userWithSameEmail) {
      throw new UsersAlreadyExistsError();
    }
    const user = await this.userRepository.create({
      name,
      email,
      passwordHash: await hash(password, 6),
    });
    return { user: toPublicUser(user) };
  }
}
