import {
    createOrder as createOrderService,
    getUserOrders,
    getUserOrderById,
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

const getOrderById = async (req, res, next) => {
    try {
        const order = await getUserOrderById({
            userId: req.user.userId,
            orderId: req.params.orderId,
        });

        /*
         * A missing order and an order owned by somebody else are intentionally
         * indistinguishable: both answer 404. Returning 403 for the latter would
         * confirm that the id exists.
         */
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Order fetched successfully.",
            data: { order },
        });
    } catch (error) {
        next(error);
    }
};

export {
    createOrder,
    getOrders,
    getOrderById,
};