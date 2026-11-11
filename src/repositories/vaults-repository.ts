import type { Prisma, Vault } from "@/prisma/client";

export interface VaultsRepository {
    findByIdAndUserId(id: string, userId: string): Promise<Vault | null>
    findManyByUserId(userId: string): Promise<Vault[]>
    create(data: Prisma.VaultUncheckedCreateInput): Promise<Vault>
}