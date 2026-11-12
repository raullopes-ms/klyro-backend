import type { VaultsRepository } from "@/repositories/vaults-repository";
import {
  toPublicCredential,
  type PublicCredential,
} from "../mappers/to-public-credential";

interface ListCredentialsUseCaseRequest {
  userId: string;
}

interface ListCredentialsUseCaseResponse {
  vaults: PublicCredential[];
}

export class ListCredentialsUseCase {
  constructor(private vaultsRepository: VaultsRepository) {}
  async execute({
    userId,
  }: ListCredentialsUseCaseRequest): Promise<ListCredentialsUseCaseResponse> {
    const vaults = await this.vaultsRepository.findManyByUserId(userId);
    return { vaults: vaults.map(toPublicCredential) };
  }
}
