import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, default: 'General', trim: true },
  status: { type: Boolean, default: true },
  stock: { type: Number, default: 0, min: 0 },
  thumbnails: { type: [String], default: [] }
}, { timestamps: true });

// ⬅️ AGREGÁS ESTO
productSchema.plugin(mongoosePaginate);

export const Product = mongoose.model('Product', productSchema);
