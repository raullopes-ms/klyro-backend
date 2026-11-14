import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repository";
import { AppError } from "@/use-cases/errors/app-error";
import { InactivateUserUseCase } from "../users/inactivateUser";

let usersRepository: InMemoryUsersRepository;
let sut: InactivateUserUseCase;

describe("Inactivate User Use Case", () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    sut = new InactivateUserUseCase(usersRepository);
  });
  it("should be able to inactivate a user", async () => {
    const user = await usersRepository.create({
      name: "John Doe",
      email: "john.doe@example.com",
    });
    const response = await sut.execute({
      id: user.id,
      userId: user.id,
    });
    expect(response.user.isActive).toBe(false);
    expect(usersRepository.users[0]?.isActive).toBe(false);
  });
  it("should not be able to inactivate another user", async () => {
    const user = await usersRepository.create({
      name: "John Doe",
      email: "john.doe@example.com",
    });
    await expect(
      sut.execute({
        id: user.id,
        userId: "another-user-id",
      }),
    ).rejects.toEqual(new AppError("You can only inactivate your own user"));
  });
  it("should not be able to inactivate a non-existent user", async () => {
    await expect(
      sut.execute({
        id: "non-existent-user-id",
        userId: "non-existent-user-id",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Recurso não encontrado.",
    });
  });
});
