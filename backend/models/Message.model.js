import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    emisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emisor_rol: { type: String, enum: ["cliente", "artista", "admin"], required: true },
    texto: { type: String, required: true, trim: true },
    leido: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);