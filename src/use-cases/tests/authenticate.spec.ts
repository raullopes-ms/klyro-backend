import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repository";
import { InvalidCredentialsError } from "@/use-cases/errors/invalid-credentials-error";
import { InactiveUserError } from "@/use-cases/errors/inactive-user-error";
import { AuthenticateUserUseCase } from "../users/authenticate";
import { describe, it, expect, beforeEach } from "vitest";
import { hash } from "bcryptjs";

let usersRepository: InMemoryUsersRepository;
let sut: AuthenticateUserUseCase;

describe("Authenticate Use Case", () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    sut = new AuthenticateUserUseCase(usersRepository);
  });
  it("should be able to authenticate", async () => {
    await usersRepository.create({
      name: "John Doe",
      email: "john.doe@example.com",
      passwordHash: await hash("password123", 6),
    });
    const { user } = await sut.execute({
      email: "john.doe@example.com",
      password: "password123",
    });
    expect(user.id).toEqual(expect.any(String));
    expect(user.isActive).toEqual(true);
    expect(user).not.toHaveProperty("passwordHash");
  });
  it("should not be able to authenticate with wrong email", async () => {
    await usersRepository.create({
      name: "John Doe",
      email: "john.doe@example.com",
      passwordHash: await hash("password123", 6),
    });
    await expect(
      sut.execute({
        email: "wrong.email@example.com",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
  it("should not be able to authenticate with wrong password", async () => {
    await usersRepository.create({
      name: "John Doe",
      email: "john.doe@example.com",
      passwordHash: await hash("password123", 6),
    });
    await expect(
      sut.execute({
        email: "john.doe@example.com",
        password: "wrongpassword",
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
  it("should not be able to authenticate an inactive user", async () => {
    await usersRepository.create({
      name: "John Doe",
      email: "john.doe@example.com",
      passwordHash: await hash("password123", 6),
      isActive: false,
    });

    await expect(
      sut.execute({
        email: "john.doe@example.com",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(InactiveUserError);
  });
});
