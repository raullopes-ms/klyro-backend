import "@fastify/jwt";

declare module "@fastify/jwt" {
  export interface FastifyJWT {
    namespaces: "access" | "refresh";
    payload: {
      tokenType: "access" | "refresh";
      sessionId?: string;
    };
    user: {
      sub: string;
      tokenType: "access" | "refresh";
      sessionId?: string;
      jti?: string;
      exp?: number;
    };
  }
}
