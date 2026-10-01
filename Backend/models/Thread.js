import mongoose from "mongoose";

const threadSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true },
  tags: [{ type: String, trim: true }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  votes: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    value: { type: Number, enum: [1, -1] }
  }]
}, { timestamps: true });

export default mongoose.model("Thread", threadSchema);
