import type { UsersRepository } from "@/repositories/users-repository";
import type { VaultsRepository } from "@/repositories/vaults-repository";
import { encrypt } from "@/lib/crypto";
import { UnauthorizedError } from "../errors/unauthorized-error";

interface CreateVaultUseCaseRequest {
  serviceName: string;
  username: string;
  password: string;
  serviceUrl?: string;
  favorite?: boolean;
  notes?: string;
  userId: string;
}
interface CreateVaultUseCaseResponse {
  vault: {
    id: string;
  };
}
export class CreateCredentialUseCase {
  constructor(
    private vaultsRepository: VaultsRepository,
    private usersRepository: UsersRepository,
  ) {}
  async execute({
    serviceName,
    username,
    password,
    serviceUrl,
    favorite,
    notes,
    userId,
  }: CreateVaultUseCaseRequest): Promise<CreateVaultUseCaseResponse> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError();
    }
    const vault = await this.vaultsRepository.create({
      serviceName,
      username,
      passwordEncrypted: encrypt(password),
      serviceUrl,
      favorite,
      notes,
      userId,
    });
    return {
      vault: {
        id: vault.id,
      },
    };
  }
}
