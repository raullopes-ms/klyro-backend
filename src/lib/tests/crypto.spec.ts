import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DecryptionError,
  InvalidEncryptionKeyError,
  KEY_BYTES,
  decrypt,
  encrypt,
  generateEncryptionKey,
  isEncrypted,
  parseEncryptionKey,
  safeEqual,
} from "../crypto";

const key = randomBytes(KEY_BYTES);
const otherKey = randomBytes(KEY_BYTES);

describe("Crypto util", () => {
  it("should be able to encrypt and decrypt a password", () => {
    const password = "sup3r-s3cr3t-p@ssword";

    const encrypted = encrypt(password, { key });

    expect(encrypted).not.toContain(password);
    expect(decrypt(encrypted, { key })).toEqual(password);
  });

  it("should produce a different payload every time for the same password", () => {
    const password = "same-password";

    const first = encrypt(password, { key });
    const second = encrypt(password, { key });

    expect(first).not.toEqual(second);
    expect(decrypt(first, { key })).toEqual(decrypt(second, { key }));
  });

  it("should keep the versioned payload format", () => {
    const encrypted = encrypt("any-password", { key });
    const parts = encrypted.split(":");

    expect(parts).toHaveLength(4);
    expect(parts[0]).toEqual("v1");
    expect(Buffer.from(parts[1] as string, "base64url")).toHaveLength(12);
    expect(Buffer.from(parts[2] as string, "base64url")).toHaveLength(16);
  });

  it("should preserve unicode and empty values", () => {
    for (const value of ["", "senha com acento ção", "🔐🔑", "a".repeat(5000)]) {
      expect(decrypt(encrypt(value, { key }), { key })).toEqual(value);
    }
  });

  it("should not decrypt with the wrong key", () => {
    const encrypted = encrypt("sup3r-s3cr3t", { key });

    expect(() => decrypt(encrypted, { key: otherKey })).toThrow(
      DecryptionError,
    );
  });

  it("should detect a tampered ciphertext", () => {
    const encrypted = encrypt("sup3r-s3cr3t", { key });
    const parts = encrypted.split(":");
    const cipherText = Buffer.from(parts[3] as string, "base64url");
    cipherText[0] = (cipherText[0] as number) ^ 0xff;
    parts[3] = cipherText.toString("base64url");

    expect(() => decrypt(parts.join(":"), { key })).toThrow(DecryptionError);
  });

  it("should detect a tampered auth tag", () => {
    const parts = encrypt("sup3r-s3cr3t", { key }).split(":");
    const authTag = Buffer.from(parts[2] as string, "base64url");
    authTag[0] = (authTag[0] as number) ^ 0xff;
    parts[2] = authTag.toString("base64url");

    expect(() => decrypt(parts.join(":"), { key })).toThrow(DecryptionError);
  });

  it("should reject malformed and unsupported payloads", () => {
    const encrypted = encrypt("sup3r-s3cr3t", { key });

    expect(() => decrypt("", { key })).toThrow(DecryptionError);
    expect(() => decrypt("plain-text-password", { key })).toThrow(
      DecryptionError,
    );
    expect(() => decrypt(encrypted.replace("v1:", "v2:"), { key })).toThrow(
      DecryptionError,
    );
    expect(() =>
      decrypt(encrypted.split(":").slice(0, 3).join(":"), { key }),
    ).toThrow(DecryptionError);
  });

  it("should bind the payload to the aad when one is given", () => {
    const encrypted = encrypt("sup3r-s3cr3t", { key, aad: "user-1" });

    expect(decrypt(encrypted, { key, aad: "user-1" })).toEqual("sup3r-s3cr3t");
    expect(() => decrypt(encrypted, { key, aad: "user-2" })).toThrow(
      DecryptionError,
    );
    expect(() => decrypt(encrypted, { key })).toThrow(DecryptionError);
  });

  it("should accept a base64 or hex key as string", () => {
    const base64Key = key.toString("base64");
    const hexKey = key.toString("hex");

    const encrypted = encrypt("sup3r-s3cr3t", { key: base64Key });

    expect(decrypt(encrypted, { key: hexKey })).toEqual("sup3r-s3cr3t");
  });

  it("should reject keys with the wrong size", () => {
    expect(() => parseEncryptionKey("")).toThrow(InvalidEncryptionKeyError);
    expect(() =>
      parseEncryptionKey(randomBytes(16).toString("base64")),
    ).toThrow(InvalidEncryptionKeyError);
    expect(() => encrypt("any", { key: randomBytes(16) })).toThrow(
      InvalidEncryptionKeyError,
    );
  });

  it("should generate a valid 32 bytes key", () => {
    const generated = generateEncryptionKey();

    expect(parseEncryptionKey(generated)).toHaveLength(KEY_BYTES);
    expect(generated).not.toEqual(generateEncryptionKey());
  });

  it("should tell encrypted payloads apart from plain text", () => {
    expect(isEncrypted(encrypt("sup3r-s3cr3t", { key }))).toBe(true);
    expect(isEncrypted("sup3r-s3cr3t")).toBe(false);
    expect(isEncrypted("v1:a:b:c")).toBe(false);
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
  });

  it("should compare secrets in constant time", () => {
    expect(safeEqual("secret", "secret")).toBe(true);
    expect(safeEqual("secret", "secreT")).toBe(false);
    expect(safeEqual("secret", "secret-longer")).toBe(false);
  });
});
