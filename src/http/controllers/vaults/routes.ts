import type { FastifyInstance } from "fastify";
import { verifyJwt } from "@/http/middlewares/verify-jwt";
import { createCredential } from "./create-credential";
import { listCredentials } from "./list-credentials";

export async function vaultsRoutes(app: FastifyInstance) {
  app.get("/credentials", { onRequest: [verifyJwt] }, listCredentials);
  app.post("/create-credential", { onRequest: [verifyJwt] }, createCredential);
}
