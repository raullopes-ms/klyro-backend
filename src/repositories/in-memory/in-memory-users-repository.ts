import type { Prisma, User } from "@/prisma/client";
import type { UsersRepository } from "../users-repository";
import { ResourceNotFoundError } from "@/use-cases/errors/resource-not-found-error";

export class InMemoryUsersRepository implements UsersRepository {
  public users: User[] = [];

  async findById(id: string): Promise<User | null> {
    const user = this.users.find((user) => user.id === id);
    if (!user) {
      return null;
    }
    return user;
  }
  async findByEmail(email: string) {
    const user = this.users.find((item) => item.email === email);
    if (!user) {
      return null;
    }
    return user;
  }
  async create(data: Prisma.UserCreateInput) {
    const user = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      emailVerified: data.emailVerified ?? false,
      image: data.image ?? null,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async inactivateUser(id: string){
    const user = await this.findById(id);
    if (!user) {
      throw new ResourceNotFoundError();
    }

    user.isActive = false;
    user.updatedAt = new Date();
    return user;
  }
}
