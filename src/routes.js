import express from 'express';
import { Product } from './dao/models/product.model.js';
import { Cart } from './dao/models/cart.model.js';

const router = express.Router();

router.get('/api', (req, res) => {
  res.send('API funcionando. Probá con /api/products o /api/carts/:cid');
});

router.get('/api/carts', async (req, res) => {
  try {
    const carts = await Cart.find().populate('products.product').lean();
    res.json({ status: 'success', payload: carts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error al obtener carritos' });
  }
});

router.get('/', (req, res) => {
  res.send('API funcionando. Usá /products para la vista o /api/products para la API.');
});

router.get('/products', async (req, res) => {
  try {
    let { limit = 10, page = 1, query, sort } = req.query;

    limit = parseInt(limit);
    page = parseInt(page);

    let filter = {};

    if (query) {
      const [field, value] = query.split(':');
      if (field && value !== undefined) {
        if (field === 'status') filter.status = value === 'true';
        else if (field === 'category') filter.category = value;
      }
    }

    let sortOption = {};
    if (sort === 'asc') sortOption.price = 1;
    else if (sort === 'desc') sortOption.price = -1;

    const totalDocs = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalDocs / limit);

    if (page < 1) page = 1;
    else if (page > totalPages) page = totalPages;

    const products = await Product.find(filter)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
    const makeLink = (p) =>
      `${baseUrl}?limit=${limit}&page=${p}${query ? `&query=${query}` : ''}${sort ? `&sort=${sort}` : ''}`;

    res.render('products', {
      products,
      totalPages,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      page,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
      prevLink: page > 1 ? makeLink(page - 1) : null,
      nextLink: page < totalPages ? makeLink(page + 1) : null,
      query,
      sort,
      limit
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar productos');
  }
});

router.get('/products/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    const product = await Product.findById(pid).lean();
    if (!product) return res.status(404).send('Producto no encontrado');

    res.render('productDetail', { product });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener producto');
  }
});

router.get('/carts/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const cart = await Cart.findById(cid).populate('products.product').lean();
    if (!cart) return res.status(404).send('Carrito no encontrado');

    res.render('cart', { cart });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener carrito');
  }
});

router.get('/api/carts/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const cart = await Cart.findById(cid).populate('products.product').lean();
    if (!cart) return res.status(404).json({ status: 'error', message: 'Carrito no encontrado' });

    res.json({ status: 'success', payload: cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error obteniendo carrito' });
  }
});

router.post('/api/carts/:cid/products/:pid', async (req, res) => {
  try {
    const { cid, pid } = req.params;
    const quantity = parseInt(req.body.quantity) || 1;

    const cart = await Cart.findById(cid);
    if (!cart) return res.status(404).send('Carrito no encontrado');

    const existingProduct = cart.products.find(p => p.product.toString() === pid);
    if (existingProduct) {
      existingProduct.quantity += quantity;
    } else {
      cart.products.push({ product: pid, quantity });
    }

    await cart.save();
    res.redirect('/products');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al agregar producto al carrito');
  }
});

router.delete('/api/carts/:cid/products/:pid', async (req, res) => {
  try {
    const { cid, pid } = req.params;
    const cart = await Cart.findById(cid);
    if (!cart) return res.status(404).json({ status: 'error', message: 'Carrito no encontrado' });

    const originalLength = cart.products.length;
    cart.products = cart.products.filter(p => p.product.toString() !== pid);

    if (cart.products.length === originalLength)
      return res.status(404).json({ status: 'error', message: 'Producto no encontrado en carrito' });

    await cart.save();
    res.json({ status: 'success', message: 'Producto eliminado del carrito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error eliminando producto del carrito' });
  }
});

router.put('/api/carts/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const products = req.body.products;

    if (!Array.isArray(products)) {
      return res.status(400).json({ status: 'error', message: 'Products debe ser un array' });
    }

    const cart = await Cart.findById(cid);
    if (!cart) return res.status(404).json({ status: 'error', message: 'Carrito no encontrado' });

    cart.products = products;
    await cart.save();

    res.json({ status: 'success', message: 'Carrito actualizado', cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error actualizando carrito' });
  }
});

router.put('/api/carts/:cid/products/:pid', async (req, res) => {
  try {
    const { cid, pid } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({ status: 'error', message: 'Quantity debe ser un número positivo' });
    }

    const cart = await Cart.findById(cid);
    if (!cart) return res.status(404).json({ status: 'error', message: 'Carrito no encontrado' });

    const productInCart = cart.products.find(p => p.product.toString() === pid);
    if (!productInCart) {
      return res.status(404).json({ status: 'error', message: 'Producto no encontrado en carrito' });
    }

    productInCart.quantity = quantity;
    await cart.save();

    res.json({ status: 'success', message: 'Cantidad actualizada', cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error actualizando cantidad' });
  }
});

router.delete('/api/carts/:cid', async (req, res) => {
  try {
    const { cid } = req.params;

    const cart = await Cart.findById(cid);
    if (!cart) return res.status(404).json({ status: 'error', message: 'Carrito no encontrado' });

    cart.products = [];
    await cart.save();

    res.json({ status: 'success', message: 'Carrito vaciado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error vaciando carrito' });
  }
});

export default router;
