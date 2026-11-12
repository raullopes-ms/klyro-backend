import { DecryptionError, encrypt } from "@/lib/crypto";
import { InMemoryVaultsRepository } from "@/repositories/in-memory/in-memory-vaults-repository";
import { ResourceNotFoundError } from "@/use-cases/errors/resource-not-found-error";
import { beforeEach, describe, expect, it } from "vitest";
import { GetCredentialUseCase } from "../vaults/getCredential";

let vaultsRepository: InMemoryVaultsRepository;
let sut: GetCredentialUseCase;

const PASSWORD = "sup3r-s3cr3t-p@ssword";

async function createCredential(userId = "user-1") {
  return vaultsRepository.create({
    serviceName: "GitHub",
    username: "john.doe",
    passwordEncrypted: encrypt(PASSWORD),
    serviceUrl: "https://github.com",
    notes: "Work account",
    favorite: true,
    userId,
  });
}

describe("Get Credential Use Case", () => {
  beforeEach(() => {
    vaultsRepository = new InMemoryVaultsRepository();
    sut = new GetCredentialUseCase(vaultsRepository);
  });

  it("should reveal a credential to its owner", async () => {
    const storedCredential = await createCredential();

    const { credential } = await sut.execute({
      credentialId: storedCredential.id,
      userId: "user-1",
    });

    expect(credential).toMatchObject({
      id: storedCredential.id,
      serviceName: "GitHub",
      username: "john.doe",
      password: PASSWORD,
      userId: "user-1",
    });
    expect(credential).not.toHaveProperty("passwordEncrypted");
  });

  it("should not reveal a credential owned by another user", async () => {
    const storedCredential = await vaultsRepository.create({
      serviceName: "GitHub",
      username: "john.doe",
      passwordEncrypted: "invalid-encrypted-payload",
      userId: "user-2",
    });

    await expect(
      sut.execute({
        credentialId: storedCredential.id,
        userId: "user-1",
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it("should return the same not found error for an unknown credential", async () => {
    await expect(
      sut.execute({
        credentialId: "unknown-credential-id",
        userId: "user-1",
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it("should propagate an invalid encrypted payload without returning data", async () => {
    const storedCredential = await vaultsRepository.create({
      serviceName: "GitHub",
      username: "john.doe",
      passwordEncrypted: "invalid-encrypted-payload",
      userId: "user-1",
    });

    await expect(
      sut.execute({
        credentialId: storedCredential.id,
        userId: "user-1",
      }),
    ).rejects.toBeInstanceOf(DecryptionError);
  });
});
