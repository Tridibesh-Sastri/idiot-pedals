import {
    createOrder as createOrderService,
    getUserOrders,
} from "../services/order.service.js";


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


const getOrders = async (req, res, next) => {
    try {
        const result = await getUserOrders({
            userId: req.user.userId,
            page: req.query.page,
            limit: req.query.limit,
            status: req.query.status,
        });

        return res.status(200).json({
            success: true,
            message: "Orders fetched successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export {
    createOrder,
    getOrders,
};