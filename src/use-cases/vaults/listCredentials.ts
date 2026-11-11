import type { Vault } from "@/prisma/client";
import type { VaultsRepository } from "@/repositories/vaults-repository";

interface ListCredentialsUseCaseRequest {
  userId: string;
}

interface ListCredentialsUseCaseResponse {
  vaults: Vault[]
}

export class ListCredentialsUseCase {
  constructor(private vaultsRepository: VaultsRepository) {}
  async execute({
    userId,
  }: ListCredentialsUseCaseRequest): Promise<ListCredentialsUseCaseResponse> {
    const vaults = await this.vaultsRepository.findManyByUserId(userId);
    return { vaults };
  }
}
