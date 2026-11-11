import type { Prisma, Vault } from "@/prisma/client";
import type { VaultsRepository } from "../vaults-repository";

export class InMemoryVaultsRepository implements VaultsRepository {
  public vaults: Vault[] = [];

  async findByIdAndUserId(id: string, userId: string) {
    const vault = this.vaults.find(
      (vault) => vault.id === id && vault.userId === userId,
    );
    if (!vault) {
      return null;
    }
    return vault;
  }

  async findManyByUserId(userId: string) {
    return this.vaults.filter((vault) => vault.userId === userId);
  }

  async create(data: Prisma.VaultUncheckedCreateInput) {
    const vault = {
      id: crypto.randomUUID(),
      serviceName: data.serviceName,
      username: data.username,
      passwordEncrypted: data.passwordEncrypted,
      serviceUrl: data.serviceUrl ?? null,
      notes: data.notes ?? null,
      favorite: data.favorite ?? false,
      createdAt: new Date(),
      userId: data.userId,
      updatedAt: new Date(),
    };
    this.vaults.push(vault);
    return vault;
  }
}
