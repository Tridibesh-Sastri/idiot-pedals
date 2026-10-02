import mongoose from "mongoose";

const { Schema } = mongoose;

const webhookEventSchema = new Schema({
  provider: { type: String, enum: ["razorpay", "shiprocket"], required: true },
  eventId: { type: String, required: true }, // razorpay: x-razorpay-event-id; shiprocket: hash of awb+status+timestamp
  eventType: { type: String },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 }, // auto-delete after 7 days
});

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

const webhookEventModel = mongoose.model("WebhookEvent", webhookEventSchema);

export default webhookEventModel;
