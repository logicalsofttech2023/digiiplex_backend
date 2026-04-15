import { V2 } from "paseto";
import { createPublicKey } from "crypto";

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export const generateKeyPair = async (): Promise<KeyPair> => {
  const privateKey = await V2.generateKey("public");
  const publicKey = createPublicKey(privateKey);
  return {
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
};