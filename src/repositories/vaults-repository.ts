import type { Prisma, Vault } from "@/prisma/client";

export interface VaultsRepository {
    findByIdAndUserId(id: string, userId: string): Promise<Vault | null>
    findManyByUserId(userId: string): Promise<Vault[]>
    deleteByIdAndUserId(id: string, userId: string): Promise<boolean>
    create(data: Prisma.VaultUncheckedCreateInput): Promise<Vault>
    update(id: string, userId: string, data: Prisma.VaultUpdateInput): Promise<Vault>
}
