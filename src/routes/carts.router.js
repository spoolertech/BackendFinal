import { Router } from 'express';
import { Cart } from '../dao/models/cart.model.js';

const router = Router();

// GET carrito con populate
router.get('/:cid', async (req, res) => {
  const cart = await Cart.findById(req.params.cid).populate('products.product');
  res.json(cart);
});

// DELETE /api/carts/:cid/products/:pid
router.delete('/:cid/products/:pid', async (req, res) => {
  const { cid, pid } = req.params;
  const cart = await Cart.findById(cid);
  cart.products = cart.products.filter(p => p.product.toString() !== pid);
  await cart.save();
  res.json({ status: 'success', message: 'Producto eliminado del carrito' });
});

// PUT /api/carts/:cid
router.put('/:cid', async (req, res) => {
  const { cid } = req.params;
  const { products } = req.body;
  await Cart.findByIdAndUpdate(cid, { products });
  res.json({ status: 'success', message: 'Carrito actualizado' });
});

// PUT /api/carts/:cid/products/:pid
router.put('/:cid/products/:pid', async (req, res) => {
  const { cid, pid } = req.params;
  const { quantity } = req.body;
  const cart = await Cart.findById(cid);
  const item = cart.products.find(p => p.product.toString() === pid);
  if (item) item.quantity = quantity;
  await cart.save();
  res.json({ status: 'success', message: 'Cantidad actualizada' });
});

// DELETE /api/carts/:cid
router.delete('/:cid', async (req, res) => {
  await Cart.findByIdAndUpdate(req.params.cid, { products: [] });
  res.json({ status: 'success', message: 'Carrito vaciado' });
});

export default router;
