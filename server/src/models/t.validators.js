// 10-digit Indian mobile, stored WITHOUT +91 (normalize before saving)
export const PHONE_RE = /^[6-9]\d{9}$/;
export const PINCODE_RE = /^[1-9]\d{5}$/;

export const intValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

// All money is stored as integer PAISE (Rs 499.90 -> 49990), same unit Razorpay uses
export const paiseValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer amount in paise",
};
