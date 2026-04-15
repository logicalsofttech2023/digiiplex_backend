import { createPrivateKey, createPublicKey, type KeyObject } from "crypto";
import { decode, V2 } from "paseto";
import ApiError from "./ApiError.js";
import { HTTP_STATUS } from "../constants/constant.js";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from "../constants/constant.js";
import {
  getActiveKeyViaGrpc,
  getPublicKeysViaGrpc,
} from "../grpc/keyGrpcClient.js";

type TokenType = "access" | "refresh";

interface TokenPayload {
  id: string;
  role: string;
  tokenType: TokenType;
  iat?: string;
  exp?: string;
}

interface ActiveKeyResponse {
  kid: string;
  publicKey: string;
  privateKey: string;
}

interface PublicKeyResponse {
  kid: string;
  publicKey: string;
}

interface CachedValue<T> {
  value: T;
  expiresAt: number;
}

let activeKeyCache: CachedValue<ActiveKeyResponse> | null = null;
let publicKeysCache: CachedValue<PublicKeyResponse[]> | null = null;

const CACHE_TTL_MS = 60_000;

const getCachedValue = <T>(cache: CachedValue<T> | null): T | null => {
  if (!cache || cache.expiresAt < Date.now()) {
    return null;
  }

  return cache.value;
};

const setCachedValue = <T>(value: T): CachedValue<T> => ({
  value,
  expiresAt: Date.now() + CACHE_TTL_MS,
});

const getActiveKey = async (): Promise<ActiveKeyResponse> => {
  const cached = getCachedValue(activeKeyCache);
  if (cached) {
    return cached;
  }

  const key = await getActiveKeyViaGrpc();
  activeKeyCache = setCachedValue(key);
  return key;
};

const getPublicKeys = async (): Promise<PublicKeyResponse[]> => {
  const cached = getCachedValue(publicKeysCache);
  if (cached) {
    return cached;
  }

  const response = await getPublicKeysViaGrpc();
  publicKeysCache = setCachedValue(response.keys);
  return response.keys;
};

const parseFooter = (footer?: Buffer): { kid?: string } => {
  if (!footer) {
    return {};
  }

  try {
    return JSON.parse(footer.toString()) as { kid?: string };
  } catch {
    return {};
  }
};

const getPublicKeyForToken = async (token: string): Promise<KeyObject> => {
  const decoded = decode(token);
  const footer = parseFooter(decoded.footer);
  const keys = await getPublicKeys();
  const matchedKey =
    keys.find((key) => key.kid === footer.kid) || (await getActiveKey());

  return createPublicKey(matchedKey.publicKey);
};

const signToken = async (
  payload: Omit<TokenPayload, "tokenType">,
  tokenType: TokenType,
  expiresIn: string,
): Promise<string> => {
  const activeKey = await getActiveKey();
  const privateKey = createPrivateKey(activeKey.privateKey);

  return V2.sign(
    {
      ...payload,
      tokenType,
    },
    privateKey,
    {
      expiresIn,
      footer: { kid: activeKey.kid },
    },
  );
};

const verifyToken = async (
  token: string,
  expectedType: TokenType,
): Promise<TokenPayload> => {
  const publicKey = await getPublicKeyForToken(token);
  const payload = await V2.verify<TokenPayload>(token, publicKey);

  if (payload.tokenType !== expectedType) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid token type");
  }

  return payload;
};

export const generateTokenPair = async (
  payload: Omit<TokenPayload, "tokenType">,
) => {
  const [accessToken, refreshToken] = await Promise.all([
    signToken(payload, "access", ACCESS_TOKEN_EXPIRES_IN),
    signToken(payload, "refresh", REFRESH_TOKEN_EXPIRES_IN),
  ]);

  return {
    accessToken,
    refreshToken,
  };
};

export const verifyAccessToken = async (token: string) =>
  verifyToken(token, "access");

export const verifyRefreshToken = async (token: string) =>
  verifyToken(token, "refresh");
