import mongoose from "mongoose";

export interface IGenre {
  name: string;
  slug: string;
  image: string;
  isActive: boolean;
}

const genreSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
  },
  description: String,
  image: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

const Genre = mongoose.model<IGenre>("genre", genreSchema);

export default Genre;
