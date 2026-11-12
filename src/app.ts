import fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import { fastifyRateLimit } from "@fastify/rate-limit";
import { ZodError, z } from "zod";
import { env } from "./env";
import { AppError } from "./use-cases/errors/app-error";
import { usersRoutes } from "./http/controllers/users/routes";
import { vaultsRoutes } from "./http/controllers/vaults/routes";
import { registerAuthTokenPlugins } from "./lib/auth-tokens";

export const app = fastify();
app.register(fastifyCookie);
registerAuthTokenPlugins(app);
app.register(fastifyRateLimit, {
  global: true,
  max: 100,
  timeWindow: "1 minute",

  errorResponseBuilder: (_, context) => ({
    statusCode: 429,
    error: "Too Many Requests",
    message: "Limite de requisições excedido. Tente novamente mais tarde.",
    retryAfter: context.after,
  }),
});
app.register(usersRoutes);
app.register(vaultsRoutes);
app.setErrorHandler((error, request, reply) => {
  if (env.NODE_ENV !== "production") {
    request.log.error(error);
  }
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: "Validation error",
      issues: z.treeifyError(error),
    });
  }
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      message: error.message,
    });
  }
  return reply.status(500).send({
    statusCode: 500,
    error: "Internal Server Error",
    message:
      "Não foi possível processar a solicitação. Tente novamente mais tarde.",
  });
});
