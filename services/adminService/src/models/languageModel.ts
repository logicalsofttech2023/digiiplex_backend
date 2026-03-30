import mongoose, { Document } from "mongoose";

export interface ILanguage {
  name: string;
  image: string;
  isActive: boolean;
}

const languageSchema = new mongoose.Schema<ILanguage>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model<ILanguage>("Language", languageSchema);
