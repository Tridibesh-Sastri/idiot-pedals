import mongoose from "mongoose";

const shipmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["shiprocket"],
      default: "shiprocket",
    },

    shipmentId: {
      type: String,
      unique: true,
      sparse: true,
    },

    channelId: {
      type: String,
    },

    awbCode: {
      type: String,
      sparse: true,
    },

    courierName: {
      type: String,
    },

    courierId: {
      type: String,
    },

    trackingUrl: {
      type: String,
    },

    status: {
      type: String,
      default: "pending",
    },

    statusCode: {
      type: String,
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

    trackingEvents: [
      {
        status: {
          type: String,
          required: true,
        },

        description: {
          type: String,
        },

        location: {
          type: String,
        },

        timestamp: {
          type: Date,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const shipmentModel = mongoose.model("Shipment", shipmentSchema);

export default shipmentModel;