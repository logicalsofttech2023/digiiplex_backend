import mongoose from "mongoose";

export interface IAdmin {
  name: string;
  email: string;
  password: string;
  role: string;
}

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "masterAdmin"],
      default: "admin",
    },
  },
  {
    timestamps: true,
  },
);

const Admin = mongoose.model<IAdmin>("Admin", adminSchema);

export default Admin;
