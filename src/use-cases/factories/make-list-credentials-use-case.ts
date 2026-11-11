import { PrismaVaultsRepository } from "@/repositories/prisma/prisma-vaults-repository";
import { ListCredentialsUseCase } from "../vaults/listCredentials";

export function makeListCredentialsUseCase() {
  const vaultsRepository = new PrismaVaultsRepository();
  return new ListCredentialsUseCase(vaultsRepository);
}
