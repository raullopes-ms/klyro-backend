import { PrismaUsersRepository } from "@/repositories/prisma/prisma-users-repository";
import { InactivateUserUseCase } from "../users/inactivateUser";

export function makeInactivateUserUseCase() {
  const usersRepository = new PrismaUsersRepository();
  const useCase = new InactivateUserUseCase(usersRepository);
  return useCase;
}