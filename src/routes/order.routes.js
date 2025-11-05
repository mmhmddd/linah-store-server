const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  getAllOrders, 
  getOrderById, 
  updateOrderStatus, 
  updateOrder,
  deleteOrder 
} = require('../controllers/order.controller');

// ✅ CREATE: Create new order
router.post('/', createOrder);

// ✅ READ: Get all orders
router.get('/', getAllOrders);

// ✅ READ: Get single order by ID
router.get('/:id', getOrderById);

// ✅ UPDATE: Update order status
router.put('/:id/status', updateOrderStatus);

// ✅ UPDATE: Edit order details (Admin only)
router.put('/:id', updateOrder);

// ✅ DELETE: Delete order
router.delete('/:id', deleteOrder);

module.exports = router;