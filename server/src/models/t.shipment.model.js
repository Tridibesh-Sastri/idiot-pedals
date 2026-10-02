import mongoose from "mongoose";

const { Schema } = mongoose;

const shipmentSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },

    provider: { type: String, enum: ["shiprocket"], default: "shiprocket" },

    shiprocketOrderId: { type: String, trim: true }, // Shiprocket's order_id
    shipmentId: { type: String, trim: true }, // Shiprocket's shipment_id
    channelId: { type: String },
    awbCode: { type: String, trim: true },

    courierName: { type: String },
    courierId: { type: String },
    trackingUrl: { type: String },
    labelUrl: { type: String },

    status: { type: String, default: "pending" },
    statusCode: { type: String },

    estimatedDeliveryDate: { type: Date },
    pickupDate: { type: Date },
    deliveredAt: { type: Date },

    isRto: { type: Boolean, default: false },
    rtoInitiatedAt: { type: Date },
    rtoDeliveredAt: { type: Date },

    // Use Shipment.addTrackingEvent() so repeated webhooks don't create duplicates
    trackingEvents: [
      {
        eventKey: { type: String },
        status: { type: String, required: true },
        description: { type: String },
        location: { type: String },
        timestamp: { type: Date, required: true },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

// unique-if-present (sparse alone is unreliable with null values)
for (const field of ["shiprocketOrderId", "shipmentId", "awbCode"]) {
  shipmentSchema.index(
    { [field]: 1 },
    { unique: true, partialFilterExpression: { [field]: { $type: "string" } } }
  );
}
shipmentSchema.index({ status: 1, updatedAt: -1 });

// Idempotent: same status+timestamp is stored only once
shipmentSchema.statics.addTrackingEvent = function (filter, evt) {
  const timestamp = new Date(evt.timestamp);
  const eventKey = `${evt.status}|${timestamp.getTime()}`;
  return this.updateOne(
    { ...filter, "trackingEvents.eventKey": { $ne: eventKey } },
    { $push: { trackingEvents: { ...evt, timestamp, eventKey } } }
  );
};

const shipmentModel = mongoose.model("Shipment", shipmentSchema);

export default shipmentModel;
