import { Router } from 'express';
import { Product } from '../dao/models/product.model.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { limit = 10, page = 1, sort, query } = req.query;

    const filter = {};

    if (query) {
      if (query === 'true' || query === 'false') {
        filter.status = query === 'true';
      } else {
        filter.$or = [
          { category: { $regex: query, $options: 'i' } },
          { title: { $regex: query, $options: 'i' } }
        ];
      }
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      lean: true
    };

    if (sort === 'asc') options.sort = { price: 1 };
    if (sort === 'desc') options.sort = { price: -1 };

    const result = await Product.paginate(filter, options);

    const { docs, totalPages, prevPage, nextPage, hasPrevPage, hasNextPage } = result;

    res.json({
      status: 'success',
      payload: docs,
      totalPages,
      prevPage,
      nextPage,
      page: parseInt(page),
      hasPrevPage,
      hasNextPage,
      prevLink: hasPrevPage ? `/api/products?page=${prevPage}` : null,
      nextLink: hasNextPage ? `/api/products?page=${nextPage}` : null
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error al obtener productos' });
  }
});

export default router;
