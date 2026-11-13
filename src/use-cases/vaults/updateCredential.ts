import { type VaultsRepository } from "@/repositories/vaults-repository";
import {
    toPublicCredential,
    type PublicCredential,
} from "../mappers/to-public-credential";
import { UnauthorizedError } from "../errors/unauthorized-error";
import { encrypt } from "@/lib/crypto";

interface UpdateCredentialUseCaseRequest {
    credentialId: string;
    serviceName?: string;
    username?: string;
    password?: string;
    serviceUrl?: string;
    favorite?: boolean;
    notes?: string;
    userId: string;
}
interface UpdateCredentialUseCaseResponse {
    vault: PublicCredential;
}
export class UpdateCredentialUseCase {
    constructor(
        private vaultsRepository: VaultsRepository,
    ) { }
    async execute({ credentialId, serviceName, username, password, serviceUrl, favorite, notes, userId }: UpdateCredentialUseCaseRequest): Promise<UpdateCredentialUseCaseResponse> {
        const user = await this.vaultsRepository.findByIdAndUserId(credentialId, userId);
        if (!user) {
            throw new UnauthorizedError();
        }
        const updatedVault = await this.vaultsRepository.update(credentialId, userId, {
            serviceName,
            username,
            passwordEncrypted: password ? encrypt(password) : undefined,
            serviceUrl,
            favorite,
            notes
        });
        return { vault: toPublicCredential(updatedVault) };
    }
}