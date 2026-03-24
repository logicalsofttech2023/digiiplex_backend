import mongoose from "mongoose";

export interface ICreator {
  name: string;
  email: string;
  password: string;
  role: string;
}

const creatorSchema = new mongoose.Schema(
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
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
  },
  {
    timestamps: true,
  },
);

const Creator = mongoose.model<ICreator>("Creator", creatorSchema);

export default Creator;
