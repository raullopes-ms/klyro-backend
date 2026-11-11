import { Buffer } from "node:buffer";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "@/env";

/**
 * Criptografia simétrica autenticada (AES-256-GCM) para os segredos do vault.
 *
 * Formato persistido: `v1:<iv>:<authTag>:<cipherText>` (cada parte em base64url).
 * O IV é sorteado a cada chamada, então o mesmo texto gera payloads diferentes,
 * e a authTag garante que qualquer alteração no banco seja detectada na leitura.
 */

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const SEPARATOR = ":";

/** Tamanho exato da chave AES-256. */
export const KEY_BYTES = 32;
/** Tamanho de IV recomendado para GCM. */
const IV_BYTES = 12;
/** Tamanho da tag de autenticação do GCM. */
const AUTH_TAG_BYTES = 16;

export interface CryptoOptions {
  /**
   * Chave usada na operação. Aceita um Buffer de 32 bytes ou uma string
   * base64/hex. Quando omitida, usa `ENCRYPTION_KEY` do ambiente.
   */
  key?: Buffer | string;
  /**
   * Dado adicional autenticado (AAD). Não é criptografado, mas entra no
   * cálculo da authTag: amarrar o payload a um contexto (ex.: o `userId`)
   * impede que um registro criptografado seja movido para outro dono.
   * O mesmo valor usado no encrypt precisa ser passado no decrypt.
   */
  aad?: string;
}

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionError";
  }
}

export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecryptionError";
  }
}

export class InvalidEncryptionKeyError extends EncryptionError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidEncryptionKeyError";
  }
}

/**
 * Gera uma chave nova em base64, pronta para colar em `ENCRYPTION_KEY`.
 *
 * `node --input-type=module -e "import('./src/lib/crypto.ts')"` não roda .ts
 * direto, então o caminho prático é:
 * `npx tsx -e "import {generateEncryptionKey} from './src/lib/crypto'; console.log(generateEncryptionKey())"`
 * ou, sem depender do projeto:
 * `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_BYTES).toString("base64");
}

/**
 * Converte a chave textual (base64 ou hex) em bytes e valida o tamanho.
 * Falha cedo e com mensagem clara em vez de deixar o `createCipheriv` estourar.
 */
export function parseEncryptionKey(rawKey: string): Buffer {
  if (!rawKey) {
    throw new InvalidEncryptionKeyError("Encryption key is missing");
  }

  const isHex = /^[0-9a-f]+$/i.test(rawKey) && rawKey.length === KEY_BYTES * 2;
  const key = Buffer.from(rawKey, isHex ? "hex" : "base64");

  if (key.length !== KEY_BYTES) {
    throw new InvalidEncryptionKeyError(
      `Encryption key must be ${KEY_BYTES} bytes (got ${key.length}). ` +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }

  return key;
}

let cachedEnvKey: Buffer | null = null;

function resolveKey(key: CryptoOptions["key"]): Buffer {
  if (typeof key === "string") {
    return parseEncryptionKey(key);
  }

  if (key) {
    if (key.length !== KEY_BYTES) {
      throw new InvalidEncryptionKeyError(
        `Encryption key must be ${KEY_BYTES} bytes (got ${key.length})`,
      );
    }
    return key;
  }

  cachedEnvKey ??= parseEncryptionKey(env.ENCRYPTION_KEY);
  return cachedEnvKey;
}

function encodePart(value: Buffer): string {
  return value.toString("base64url");
}

function decodePart(value: string, expectedBytes?: number): Buffer {
  const decoded = Buffer.from(value, "base64url");

  if (decoded.length === 0 && value.length > 0) {
    throw new DecryptionError("Malformed encrypted payload");
  }

  if (expectedBytes !== undefined && decoded.length !== expectedBytes) {
    throw new DecryptionError("Malformed encrypted payload");
  }

  return decoded;
}

/**
 * Criptografa um texto (senha, token, nota) para armazenamento.
 *
 * @returns payload autocontido no formato `v1:<iv>:<authTag>:<cipherText>`.
 */
export function encrypt(plainText: string, options: CryptoOptions = {}): string {
  if (typeof plainText !== "string") {
    throw new EncryptionError("Only strings can be encrypted");
  }

  const key = resolveKey(options.key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_BYTES,
  });

  if (options.aad) {
    cipher.setAAD(Buffer.from(options.aad, "utf8"));
  }

  const cipherText = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  return [
    VERSION,
    encodePart(iv),
    encodePart(cipher.getAuthTag()),
    encodePart(cipherText),
  ].join(SEPARATOR);
}

/**
 * Descriptografa um payload gerado por {@link encrypt}.
 *
 * Lança {@link DecryptionError} se o payload estiver corrompido, se a chave
 * estiver errada ou se o `aad` não for o mesmo usado na criptografia — nunca
 * retorna dado parcial/não autenticado.
 */
export function decrypt(payload: string, options: CryptoOptions = {}): string {
  if (typeof payload !== "string" || payload.length === 0) {
    throw new DecryptionError("Malformed encrypted payload");
  }

  const parts = payload.split(SEPARATOR);

  if (parts.length !== 4) {
    throw new DecryptionError("Malformed encrypted payload");
  }

  const [version, rawIv, rawAuthTag, rawCipherText] = parts as [
    string,
    string,
    string,
    string,
  ];

  if (version !== VERSION) {
    throw new DecryptionError(`Unsupported payload version: ${version}`);
  }

  const key = resolveKey(options.key);
  const iv = decodePart(rawIv, IV_BYTES);
  const authTag = decodePart(rawAuthTag, AUTH_TAG_BYTES);
  const cipherText = decodePart(rawCipherText);

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_BYTES,
  });
  decipher.setAuthTag(authTag);

  if (options.aad) {
    decipher.setAAD(Buffer.from(options.aad, "utf8"));
  }

  try {
    return Buffer.concat([
      decipher.update(cipherText),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Mensagem genérica de propósito: não revela se o problema foi a chave,
    // o aad ou o conteúdo adulterado.
    throw new DecryptionError("Unable to decrypt payload");
  }
}

/**
 * Diz se o valor já está no formato criptografado desta util.
 * Útil para migrar registros antigos salvos em texto puro.
 */
export function isEncrypted(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const parts = value.split(SEPARATOR);

  if (parts.length !== 4 || parts[0] !== VERSION) {
    return false;
  }

  try {
    decodePart(parts[1] as string, IV_BYTES);
    decodePart(parts[2] as string, AUTH_TAG_BYTES);
    decodePart(parts[3] as string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Comparação em tempo constante para checar segredos sem vazar, pelo tempo
 * de resposta, quantos caracteres bateram.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}
