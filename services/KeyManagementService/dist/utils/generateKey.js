import { V2 } from "paseto";
import { createPublicKey } from "crypto";
export const generateKeyPair = async () => {
    const privateKey = await V2.generateKey("public");
    const publicKey = createPublicKey(privateKey);
    return {
        publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
        privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    };
};
//# sourceMappingURL=generateKey.js.map