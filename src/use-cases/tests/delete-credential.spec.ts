import { InMemoryVaultsRepository } from "@/repositories/in-memory/in-memory-vaults-repository";
import { ResourceNotFoundError } from "@/use-cases/errors/resource-not-found-error";
import { beforeEach, describe, expect, it } from "vitest";
import { DeleteCredentialUseCase } from "../vaults/deleteCredential";

let vaultsRepository: InMemoryVaultsRepository;
let sut: DeleteCredentialUseCase;

async function createCredential(userId = "user-1") {
  return vaultsRepository.create({
    serviceName: "GitHub",
    username: "john.doe",
    passwordEncrypted: "invalid-encrypted-payload",
    userId,
  });
}

describe("Delete Credential Use Case", () => {
  beforeEach(() => {
    vaultsRepository = new InMemoryVaultsRepository();
    sut = new DeleteCredentialUseCase(vaultsRepository);
  });

  it("should let the owner delete a credential without returning data", async () => {
    const storedCredential = await createCredential();

    const result = await sut.execute({
      credentialId: storedCredential.id,
      userId: "user-1",
    });

    expect(result).toBeUndefined();
    expect(vaultsRepository.vaults).toHaveLength(0);
  });

  it("should not delete a credential owned by another user", async () => {
    const storedCredential = await createCredential("user-2");

    await expect(
      sut.execute({
        credentialId: storedCredential.id,
        userId: "user-1",
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(vaultsRepository.vaults).toContainEqual(storedCredential);
  });

  it("should return the same not found error for an unknown credential", async () => {
    await expect(
      sut.execute({
        credentialId: "unknown-credential-id",
        userId: "user-1",
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});
