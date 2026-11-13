import { PrismaVaultsRepository } from "@/repositories/prisma/prisma-vaults-repository";
import { UpdateCredentialUseCase } from "../vaults/updateCredential";

export function makeUpdateCredentialUseCase() {
    const vaultsRepository = new PrismaVaultsRepository();
    const useCase = new UpdateCredentialUseCase(vaultsRepository);
    return useCase;
}