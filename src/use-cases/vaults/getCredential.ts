import { decrypt } from "@/lib/crypto";
import type { VaultsRepository } from "@/repositories/vaults-repository";
import { ResourceNotFoundError } from "../errors/resource-not-found-error";
import {
  toRevealedCredential,
  type RevealedCredential,
} from "../mappers/to-revealed-credential";

interface GetCredentialUseCaseRequest {
  credentialId: string;
  userId: string;
}

interface GetCredentialUseCaseResponse {
  credential: RevealedCredential;
}

export class GetCredentialUseCase {
  constructor(private vaultsRepository: VaultsRepository) {}
  async execute({
    credentialId,
    userId,
  }: GetCredentialUseCaseRequest): Promise<GetCredentialUseCaseResponse> {
    const vault = await this.vaultsRepository.findByIdAndUserId(
      credentialId,
      userId,
    );
    if (!vault) {
      throw new ResourceNotFoundError();
    }
    const password = decrypt(vault.passwordEncrypted);
    return {
      credential: toRevealedCredential(vault, password),
    };
  }
}
