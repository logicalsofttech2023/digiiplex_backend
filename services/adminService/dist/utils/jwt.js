import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../constants/constant.js";
export const generateToken = (payload) => {
    const options = {
        expiresIn: JWT_EXPIRES_IN,
    };
    return jwt.sign(payload, JWT_SECRET, options);
};
//# sourceMappingURL=jwt.js.map