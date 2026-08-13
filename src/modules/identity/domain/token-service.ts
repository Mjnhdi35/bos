import { type UserId } from './value-objects/user-id';

export type AccessToken = string & { readonly __brand: 'AccessToken' };
export type RefreshToken = string & { readonly __brand: 'RefreshToken' };
export type RefreshTokenHash = string & { readonly __brand: 'RefreshTokenHash' };

export type AccessTokenIssued = {
  token: AccessToken;
  expiresAt: Date;
};

export type RefreshTokenIssued = {
  token: RefreshToken;
  hash: RefreshTokenHash;
  expiresAt: Date;
};

export interface TokenService {
  issueAccessToken(_userId: UserId): Promise<AccessTokenIssued>;
  verifyAccessToken(_token: AccessToken): Promise<UserId>;
  generateRefreshToken(): RefreshTokenIssued;
  hashRefreshToken(_token: RefreshToken): RefreshTokenHash;
}
