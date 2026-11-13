import type { UsersRepository } from "@/repositories/users-repository";
import type { VaultsRepository } from "@/repositories/vaults-repository";
import type { PublicCredential } from "../mappers/to-public-credential";
import { UnauthorizedError } from "../errors/unauthorized-error";
import { encrypt } from "@/lib/crypto";
import { InactiveUserError } from "../errors/inactive-user-error";

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
  vault: PublicCredential;
}
export class CreateCredentialUseCase {
  constructor(
    private vaultsRepository: VaultsRepository,
    private usersRepository: UsersRepository,
  ) { }
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
    if(!user.isActive){
      throw new InactiveUserError();
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
      vault,
    };
  }
}
