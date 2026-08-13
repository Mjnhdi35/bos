import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";
import { type TokenService, type AccessToken, type AccessTokenIssued, type RefreshToken, type RefreshTokenHash, type RefreshTokenIssued } from "../../domain/token-service";
import { type UserId } from "../../domain/value-objects/user-id";

export type JwtTokenServiceConfig = {
  readonly secret: string;
  readonly accessTtl: string;
  readonly refreshTtl: string;
};

export function createJwtTokenService(config: JwtTokenServiceConfig): TokenService {
  const secretKey = new TextEncoder().encode(config.secret);
  const accessMs = parseTtl(config.accessTtl);
  const refreshMs = parseTtl(config.refreshTtl);

  return {
    async issueAccessToken(userId: UserId): Promise<AccessTokenIssued> {
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime(config.accessTtl)
        .sign(secretKey);
      return {
        token: token as AccessToken,
        expiresAt: new Date(Date.now() + accessMs),
      };
    },

    async verifyAccessToken(token: AccessToken): Promise<UserId> {
      const { payload } = await jwtVerify(token, secretKey);
      if (typeof payload.sub !== "string") {
        throw new Error("Token missing sub claim");
      }
      return payload.sub as UserId;
    },

    generateRefreshToken(): RefreshTokenIssued {
      const token = randomBytes(32).toString("base64url");
      const hash = createHash("sha256").update(token).digest("hex");
      return {
        token: token as RefreshToken,
        hash: hash as RefreshTokenHash,
        expiresAt: new Date(Date.now() + refreshMs),
      };
    },

    hashRefreshToken(token: RefreshToken): RefreshTokenHash {
      return createHash("sha256").update(token).digest("hex") as RefreshTokenHash;
    },
  };
}

function parseTtl(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) throw new Error(`Invalid TTL format: ${ttl}`);
  const n = Number(match[1]);
  const unit = match[2] ?? "";
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  const mult = multipliers[unit] ?? 0;
  if (mult === 0) throw new Error(`Invalid TTL unit: ${unit}`);
  return n * mult;
}
