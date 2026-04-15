import { createPrivateKey, createPublicKey } from "crypto";
import { decode, V2 } from "paseto";
import ApiError from "./ApiError.js";
import { HTTP_STATUS } from "../constants/constant.js";
import { ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN, } from "../constants/constant.js";
import { getActiveKeyViaGrpc, getPublicKeysViaGrpc, } from "../grpc/keyGrpcClient.js";
let activeKeyCache = null;
let publicKeysCache = null;
const CACHE_TTL_MS = 60_000;
const getCachedValue = (cache) => {
    if (!cache || cache.expiresAt < Date.now()) {
        return null;
    }
    return cache.value;
};
const setCachedValue = (value) => ({
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
});
const getActiveKey = async () => {
    const cached = getCachedValue(activeKeyCache);
    if (cached) {
        return cached;
    }
    const key = await getActiveKeyViaGrpc();
    activeKeyCache = setCachedValue(key);
    return key;
};
const getPublicKeys = async () => {
    const cached = getCachedValue(publicKeysCache);
    if (cached) {
        return cached;
    }
    const response = await getPublicKeysViaGrpc();
    publicKeysCache = setCachedValue(response.keys);
    return response.keys;
};
const parseFooter = (footer) => {
    if (!footer) {
        return {};
    }
    try {
        return JSON.parse(footer.toString());
    }
    catch {
        return {};
    }
};
const getPublicKeyForToken = async (token) => {
    const decoded = decode(token);
    const footer = parseFooter(decoded.footer);
    const keys = await getPublicKeys();
    const matchedKey = keys.find((key) => key.kid === footer.kid) || (await getActiveKey());
    return createPublicKey(matchedKey.publicKey);
};
const signToken = async (payload, tokenType, expiresIn) => {
    const activeKey = await getActiveKey();
    const privateKey = createPrivateKey(activeKey.privateKey);
    return V2.sign({
        ...payload,
        tokenType,
    }, privateKey, {
        expiresIn,
        footer: { kid: activeKey.kid },
    });
};
const verifyToken = async (token, expectedType) => {
    const publicKey = await getPublicKeyForToken(token);
    const payload = await V2.verify(token, publicKey);
    if (payload.tokenType !== expectedType) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid token type");
    }
    return payload;
};
export const generateTokenPair = async (payload) => {
    const [accessToken, refreshToken] = await Promise.all([
        signToken(payload, "access", ACCESS_TOKEN_EXPIRES_IN),
        signToken(payload, "refresh", REFRESH_TOKEN_EXPIRES_IN),
    ]);
    return {
        accessToken,
        refreshToken,
    };
};
export const verifyAccessToken = async (token) => verifyToken(token, "access");
export const verifyRefreshToken = async (token) => verifyToken(token, "refresh");
//# sourceMappingURL=jwt.js.map