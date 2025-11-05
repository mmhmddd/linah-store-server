const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Book = require('../models/Book');
const Order = require('../models/Order');

// Helper function to get user ID from token if valid
const getUserIdFromToken = (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id || decoded._id;
  } catch (err) {
    return null;
  }
};

// Helper function to check if user is admin
const isAdmin = async (userId) => {
  if (!userId) return false;
  const user = await User.findById(userId);
  return user && user.role === 'admin';
};

// ✅ CREATE: Create new order
const createOrder = async (req, res) => {
  const { government, fullName, address, paymentMethod, saleCode, notes, items } = req.body;

  if (!government || !fullName || !address || !paymentMethod) {
    return res.status(400).json({ message: 'Government, full name, address, and payment method are required' });
  }

  if (!['cash', 'visa'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Payment method must be "cash" or "visa"' });
  }

  try {
    const userId = getUserIdFromToken(req);

    // Validate items if provided directly (for admin create)
    let validatedItems = items;
    if (!items) {
      // Get from user cart
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      validatedItems = user.cart;
    }

    if (!validatedItems || validatedItems.length === 0) {
      return res.status(400).json({ message: 'Cart/Items is empty' });
    }

    let totalAmount = 0;
    const orderItems = await Promise.all(validatedItems.map(async (item) => {
      const book = await Book.findById(item.book);
      if (!book) throw new Error(`Book not found: ${item.book}`);
      if (book.quantity < item.quantity) {
        throw new Error(`Insufficient stock for book: ${book.title || book.name}`);
      }
      const itemPrice = book.price * item.quantity;
      totalAmount += itemPrice;
      return {
        book: item.book,
        quantity: item.quantity,
        price: book.price
      };
    }));

    // Apply discount
    if (saleCode === 'DISCOUNT10') {
      totalAmount *= 0.9;
    } else if (saleCode) {
      return res.status(400).json({ message: 'Invalid sale code' });
    }

    const order = new Order({
      user: userId || null,
      items: orderItems,
      totalAmount,
      government,
      fullName,
      address,
      paymentMethod,
      saleCode: saleCode || null,
      notes: notes || null,
      status: 'قيد الانتظار'
    });
    await order.save();

    // Update book quantities
    for (const item of orderItems) {
      const book = await Book.findById(item.book);
      book.quantity -= item.quantity;
      await book.save();
    }

    // Clear user cart if exists
    if (userId) {
      const user = await User.findById(userId);
      user.cart = [];
      user.orders.push(order._id);
      await user.save();
    }

    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: 'items.book',
        select: 'name title price imgs category'
      })
      .populate('user', 'fullName email');

    res.status(201).json({ 
      message: 'تم إنشاء الطلب بنجاح', 
      order: populatedOrder 
    });
  } catch (error) {
    console.error('createOrder error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ READ: Get ALL orders (Admin + User)
const getAllOrders = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const isAdminUser = await isAdmin(userId);

    let query = {};
    if (!isAdminUser && userId) {
      query.user = userId;
    }

    const orders = await Order.find(query)
      .populate({
        path: 'items.book',
        select: 'name title price imgs category'
      })
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 });

    res.json({ 
      message: 'تم جلب الطلبات بنجاح', 
      orders,
      count: orders.length 
    });
  } catch (error) {
    console.error('getAllOrders error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ READ: Get single order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserIdFromToken(req);
    const isAdminUser = await isAdmin(userId);

    const order = await Order.findById(id)
      .populate({
        path: 'items.book',
        select: 'name title price imgs category'
      })
      .populate('user', 'fullName email');

    if (!order) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }

    // Check permissions
    if (!isAdminUser && order.user?.toString() !== userId) {
      return res.status(403).json({ message: 'غير مصرح لك' });
    }

    res.json({ message: 'تم جلب الطلب بنجاح', order });
  } catch (error) {
    console.error('getOrderById error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ UPDATE: Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['قيد الانتظار', 'مسلم', 'ملغي'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'حالة غير صالحة. يجب أن تكون: قيد الانتظار، مسلم، ملغي' 
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }

    const userId = getUserIdFromToken(req);
    const isAdminUser = await isAdmin(userId);

    // Check permissions
    if (!isAdminUser && order.user?.toString() !== userId) {
      return res.status(403).json({ message: 'غير مصرح لك' });
    }

    // Prevent changing from delivered back to pending
    if (order.status === 'مسلم' && status !== 'ملغي') {
      return res.status(400).json({ message: 'لا يمكن تغيير حالة الطلب المسلم' });
    }

    order.status = status;
    await order.save();

    const populatedOrder = await Order.findById(id)
      .populate({
        path: 'items.book',
        select: 'name title price imgs category'
      })
      .populate('user', 'fullName email');

    res.json({ 
      message: `تم تحديث حالة الطلب إلى ${status}`, 
      order: populatedOrder 
    });
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ UPDATE: Edit order details (Admin only)
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserIdFromToken(req);
    const isAdminUser = await isAdmin(userId);

    if (!isAdminUser) {
      return res.status(403).json({ message: 'غير مصرح لك' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }

    // Update allowed fields
    const allowedUpdates = [
      'government', 'fullName', 'address', 'paymentMethod', 
      'saleCode', 'notes', 'status'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Validate payment method
    if (updates.paymentMethod && !['cash', 'visa'].includes(updates.paymentMethod)) {
      return res.status(400).json({ message: 'طريقة الدفع يجب أن تكون cash أو visa' });
    }

    // Validate status
    if (updates.status) {
      const validStatuses = ['قيد الانتظار', 'مسلم', 'ملغي'];
      if (!validStatuses.includes(updates.status)) {
        return res.status(400).json({ 
          message: 'حالة غير صالحة. يجب أن تكون: قيد الانتظار، مسلم، ملغي' 
        });
      }
    }

    Object.assign(order, updates);
    await order.save();

    const populatedOrder = await Order.findById(id)
      .populate({
        path: 'items.book',
        select: 'name title price imgs category'
      })
      .populate('user', 'fullName email');

    res.json({ 
      message: 'تم تحديث الطلب بنجاح', 
      order: populatedOrder 
    });
  } catch (error) {
    console.error('updateOrder error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ DELETE: Delete order
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserIdFromToken(req);
    const isAdminUser = await isAdmin(userId);

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }

    // Check permissions
    if (!isAdminUser && order.user?.toString() !== userId) {
      return res.status(403).json({ message: 'غير مصرح لك' });
    }

    // Restore book quantities before deletion
    for (const item of order.items) {
      const book = await Book.findById(item.book);
      if (book) {
        book.quantity += item.quantity;
        await book.save();
      }
    }

    // Remove from user orders if exists
    if (order.user) {
      const user = await User.findById(order.user);
      if (user) {
        user.orders = user.orders.filter(orderId => orderId.toString() !== id);
        await user.save();
      }
    }

    await Order.findByIdAndDelete(id);
    res.json({ message: 'تم حذف الطلب بنجاح' });
  } catch (error) {
    console.error('deleteOrder error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  createOrder, 
  getAllOrders, 
  getOrderById, 
  updateOrderStatus, 
  updateOrder,
  deleteOrder 
};