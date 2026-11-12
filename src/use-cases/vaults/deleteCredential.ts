import type { VaultsRepository } from "@/repositories/vaults-repository";
import { ResourceNotFoundError } from "../errors/resource-not-found-error";

interface DeleteCredentialUseCaseRequest {
  credentialId: string;
  userId: string;
}

export class DeleteCredentialUseCase {
  constructor(private vaultsRepository: VaultsRepository) {}

  async execute({
    credentialId,
    userId,
  }: DeleteCredentialUseCaseRequest): Promise<void> {
    const wasDeleted = await this.vaultsRepository.deleteByIdAndUserId(
      credentialId,
      userId,
    );

    if (!wasDeleted) {
      throw new ResourceNotFoundError();
    }
  }
}
