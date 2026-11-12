import { InMemoryVaultsRepository } from "@/repositories/in-memory/in-memory-vaults-repository";
import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repository";
import { UnauthorizedError } from "@/use-cases/errors/unauthorized-error";
import { decrypt, isEncrypted } from "@/lib/crypto";
import { describe, it, expect, beforeEach } from "vitest";
import { CreateCredentialUseCase } from "../vaults/createCredential";

let vaultsRepository: InMemoryVaultsRepository;
let usersRepository: InMemoryUsersRepository;
let sut: CreateCredentialUseCase;

const PASSWORD = "sup3r-s3cr3t-p@ssword";

async function createUser(email = "john.doe@example.com") {
  return usersRepository.create({
    name: "John Doe",
    email,
  });
}

describe("Create Credential Use Case", () => {
  beforeEach(() => {
    vaultsRepository = new InMemoryVaultsRepository();
    usersRepository = new InMemoryUsersRepository();
    sut = new CreateCredentialUseCase(vaultsRepository, usersRepository);
  });

  it("should be able to create a credential", async () => {
    const user = await createUser();

    const { vault } = await sut.execute({
      serviceName: "GitHub",
      username: "john.doe",
      password: PASSWORD,
      serviceUrl: "https://github.com",
      notes: "Work account",
      favorite: true,
      userId: user.id,
    });

    expect(vault.id).toEqual(expect.any(String));
    expect(vaultsRepository.vaults).toHaveLength(1);
    expect(vaultsRepository.vaults[0]).toMatchObject({
      serviceName: "GitHub",
      username: "john.doe",
      serviceUrl: "https://github.com",
      notes: "Work account",
      favorite: true,
      userId: user.id,
    });
  });

  it("should store the password encrypted, never in plain text", async () => {
    const user = await createUser();

    await sut.execute({
      serviceName: "GitHub",
      username: "john.doe",
      password: PASSWORD,
      userId: user.id,
    });

    const stored = vaultsRepository.vaults[0]!;

    expect(stored.passwordEncrypted).not.toEqual(PASSWORD);
    expect(stored.passwordEncrypted).not.toContain(PASSWORD);
    expect(isEncrypted(stored.passwordEncrypted)).toBe(true);
  });

  it("should store a password that can be decrypted back", async () => {
    const user = await createUser();

    await sut.execute({
      serviceName: "GitHub",
      username: "john.doe",
      password: PASSWORD,
      userId: user.id,
    });

    const stored = vaultsRepository.vaults[0]!;

    expect(decrypt(stored.passwordEncrypted)).toEqual(PASSWORD);
  });

  it("should produce a different ciphertext for the same password", async () => {
    const user = await createUser();

    await sut.execute({
      serviceName: "GitHub",
      username: "john.doe",
      password: PASSWORD,
      userId: user.id,
    });
    await sut.execute({
      serviceName: "GitLab",
      username: "john.doe",
      password: PASSWORD,
      userId: user.id,
    });

    const [first, second] = vaultsRepository.vaults;

    expect(first!.passwordEncrypted).not.toEqual(second!.passwordEncrypted);
    expect(decrypt(first!.passwordEncrypted)).toEqual(
      decrypt(second!.passwordEncrypted),
    );
  });

  it("should be able to encrypt passwords with unicode characters", async () => {
    const user = await createUser();
    const password = "sënha-com-açento-🔐";

    await sut.execute({
      serviceName: "GitHub",
      username: "john.doe",
      password,
      userId: user.id,
    });

    expect(decrypt(vaultsRepository.vaults[0]!.passwordEncrypted)).toEqual(
      password,
    );
  });

  it("should not be able to create a credential for a non-existent user", async () => {
    await expect(
      sut.execute({
        serviceName: "GitHub",
        username: "john.doe",
        password: PASSWORD,
        userId: "non-existent-user-id",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("should not store anything for a non-existent user", async () => {
    await expect(
      sut.execute({
        serviceName: "GitHub",
        username: "john.doe",
        password: PASSWORD,
        userId: "non-existent-user-id",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(vaultsRepository.vaults).toHaveLength(0);
  });
});
