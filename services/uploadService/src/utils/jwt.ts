import jwt, { SignOptions} from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../constants/constant.js";

export const generateToken = (payload: object) => {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  }
  return jwt.sign(payload, JWT_SECRET as string, options);
};
