import { PrismaVaultsRepository } from "@/repositories/prisma/prisma-vaults-repository";
import { CreateCredentialUseCase } from "../vaults/createCredential";
import { PrismaUsersRepository } from "@/repositories/prisma/prisma-users-repository";

export function makeCreateCredentialUseCase() {
  const usersRepository = new PrismaUsersRepository();
  const vaultsRepository = new PrismaVaultsRepository();
  const useCase = new CreateCredentialUseCase(
    vaultsRepository,
    usersRepository,
  );
  return useCase;
}
