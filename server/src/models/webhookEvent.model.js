import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      maxlength: 200,
    },

    event: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    status: {
      type: String,
      enum: [
        "processing",
        "processed",
        "ignored",
        "failed",
      ],
      default: "processing",
      required: true,
    },

    processedAt: {
      type: Date,
    },

    errorMessage: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

const webhookEventModel =
  mongoose.models.WebhookEvent ||
  mongoose.model("WebhookEvent", webhookEventSchema);

export default webhookEventModel;