import { PrismaVaultsRepository } from "@/repositories/prisma/prisma-vaults-repository";
import { DeleteCredentialUseCase } from "../vaults/deleteCredential";

export function makeDeleteCredentialUseCase() {
  const vaultsRepository = new PrismaVaultsRepository();
  return new DeleteCredentialUseCase(vaultsRepository);
}
