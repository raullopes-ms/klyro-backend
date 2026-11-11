import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repository";
import { UsersAlreadyExistsError } from "@/use-cases/errors/user-already-exists-error";
import { RegisterUserUseCase } from "../users/register";
import { describe, it, expect, beforeEach } from "vitest";

let usersRepository: InMemoryUsersRepository;
let sut: RegisterUserUseCase;

describe("Register Use Case", () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    sut = new RegisterUserUseCase(usersRepository);
  });
  it("should be able to register", async () => {
    const { user } = await sut.execute({
      name: "John Doe",
      email: "john.doe@example.com",
      password: "password123",
    });
    expect(user.id).toEqual(expect.any(String));
    expect(user.isActive).toEqual(true);
  });
  it("should not be able to register with same email twice", async () => {
    await sut.execute({
      name: "John Doe",
      email: "john.doe@example.com",
      password: "password123",
    });
    await expect(
      sut.execute({
        name: "Jane Doe",
        email: "john.doe@example.com",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(UsersAlreadyExistsError);
  });
});
