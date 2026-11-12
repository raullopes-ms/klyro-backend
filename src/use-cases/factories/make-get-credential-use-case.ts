import { PrismaVaultsRepository } from "@/repositories/prisma/prisma-vaults-repository";
import { GetCredentialUseCase } from "../vaults/getCredential";

export function makeGetCredentialUseCase() {
  const vaultsRepository = new PrismaVaultsRepository();
  return new GetCredentialUseCase(vaultsRepository);
}
