import { UsersAlreadyExistsError } from "@/use-cases/errors/user-already-exists-error";
import { makeRegisterUseCase } from "@/use-cases/factories/make-register-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const registerBodySchema = z.object({
    name: z.string(),
    email: z.email(),
    password: z.string().min(8),
  });
  const { name, email, password } = registerBodySchema.parse(request.body);
  try {
    const registerUseCase = makeRegisterUseCase();
    await registerUseCase.execute({
      name,
      email,
      password,
    });
    return reply.status(201).send();
  } catch (error) {
    if (error instanceof UsersAlreadyExistsError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}
