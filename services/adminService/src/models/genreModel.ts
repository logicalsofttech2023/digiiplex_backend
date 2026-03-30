import mongoose, { Document } from "mongoose";

export interface IGenre {
  name: string;
  image: string;
  isActive: boolean;
}

const genreSchema = new mongoose.Schema<IGenre>(
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

export default mongoose.model<IGenre>("Genre", genreSchema);
