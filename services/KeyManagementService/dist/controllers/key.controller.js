import { createNewKey, getPublicKeys, getActiveKey, } from "../services/key.service.js";
export const rotateKey = async (_req, res) => {
    const key = await createNewKey();
    res.json({ message: "Key rotated", kid: key.kid });
};
export const publicKeys = async (_req, res) => {
    const keys = await getPublicKeys();
    res.json({ keys });
};
export const activeKey = async (_req, res) => {
    const key = await getActiveKey();
    if (!key) {
        return res.status(404).json({ message: "No active key" });
    }
    res.json({
        kid: key.kid,
        publicKey: key.publicKey,
        privateKey: key.privateKey, // ⚠️ internal only
    });
};
//# sourceMappingURL=key.controller.js.map