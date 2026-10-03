import mongoose from "mongoose";

const URL_MAX_LENGTH = 2048;
const STATUS_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;
const LOCATION_MAX_LENGTH = 200;

const trackingEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      trim: true,
      maxlength: STATUS_MAX_LENGTH,
    },

    description: {
      type: String,
      trim: true,
      maxlength: DESCRIPTION_MAX_LENGTH,
    },

    location: {
      type: String,
      trim: true,
      maxlength: LOCATION_MAX_LENGTH,
    },

    timestamp: {
      type: Date,
      required: true,
    },
  },
  { _id: false, strict: true }
);

const shipmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      immutable: true,
    },

    provider: {
      type: String,
      enum: ["shiprocket"],
      required: true,
      default: "shiprocket",
      immutable: true,
      index: true,
    },

    shipmentId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      maxlength: 100,
    },

    channelId: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    awbCode: {
      type: String,
      sparse: true,
      trim: true,
      maxlength: 100,
      index: true,
    },

    courierName: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    courierId: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    trackingUrl: {
      type: String,
      trim: true,
      maxlength: URL_MAX_LENGTH,
      validate: {
        validator: (value) => {
          if (value == null || value === "") return true;
          try {
            const url = new URL(value);
            return ["http:", "https:"].includes(url.protocol);
          } catch {
            return false;
          }
        },
        message: "Tracking URL must be a valid HTTP(S) URL.",
      },
    },

    status: {
      type: String,
      required: true,
      default: "pending",
      trim: true,
      maxlength: STATUS_MAX_LENGTH,
      index: true,
    },

    statusCode: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    estimatedDeliveryDate: {
      type: Date,
    },

    pickupDate: {
      type: Date,
    },

    deliveredAt: {
      type: Date,
    },

    trackingEvents: {
      type: [trackingEventSchema],
      default: [],
      validate: {
        validator: (events) => events.length <= 500,
        message: "A shipment can contain at most 500 tracking events.",
      },
    },
  },
  {
    timestamps: true,
    strict: true,
    minimize: false,
  }
);

shipmentSchema.index({ status: 1, updatedAt: -1 });
shipmentSchema.index({ "trackingEvents.timestamp": -1 });

/*
 * Mongoose 9 runs pre hooks as promises — the callback `next` argument is no
 * longer provided, so hooks must not declare or call it.
 */
shipmentSchema.pre("validate", function () {
  if (
    this.deliveredAt &&
    this.pickupDate &&
    this.deliveredAt < this.pickupDate
  ) {
    this.invalidate(
      "deliveredAt",
      "Delivered date cannot be earlier than pickup date."
    );
  }

  if (
    this.estimatedDeliveryDate &&
    this.pickupDate &&
    this.estimatedDeliveryDate < this.pickupDate
  ) {
    this.invalidate(
      "estimatedDeliveryDate",
      "Estimated delivery date cannot be earlier than pickup date."
    );
  }
});

const shipmentModel =
  mongoose.models.Shipment || mongoose.model("Shipment", shipmentSchema);

export default shipmentModel;
