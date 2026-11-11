import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryVaultsRepository } from "@/repositories/in-memory/in-memory-vaults-repository";
import { ListCredentialsUseCase } from "@/use-cases/vaults/listCredentials";

let vaultsRepository: InMemoryVaultsRepository;
let sut: ListCredentialsUseCase;

describe("List Credentials Use Case", () => {
  beforeEach(() => {
    vaultsRepository = new InMemoryVaultsRepository();
    sut = new ListCredentialsUseCase(vaultsRepository);
  });

  it("should be able to list only the user's credentials", async () => {
    await vaultsRepository.create({
      serviceName: "GitHub",
      username: "john.doe",
      passwordEncrypted: "encrypted-password",
      userId: "user-1",
    });
    await vaultsRepository.create({
      serviceName: "Google",
      username: "jane.doe",
      passwordEncrypted: "other-password",
      userId: "user-2",
    });

    const { vaults } = await sut.execute({ userId: "user-1" });

    expect(vaults).toHaveLength(1);
    expect(vaults[0]).toMatchObject({
      serviceName: "GitHub",
      userId: "user-1",
    });
  });

  it("should return an empty list when the user has no credentials", async () => {
    const { vaults } = await sut.execute({ userId: "user-without-credentials" });

    expect(vaults).toEqual([]);
  });
});
