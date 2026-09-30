import { createOrder as createOrderService } from "../services/order.service.js";

const createOrder = async (req, res, next) => {
  try {
    const order = await createOrderService({
      userId: req.user.userId,
      items: req.body.items,
      paymentMethod: req.body.paymentMethod,
      customer: req.body.customer,
      shippingAddress: req.body.shippingAddress,
    });

    return res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

export {
  createOrder,
};