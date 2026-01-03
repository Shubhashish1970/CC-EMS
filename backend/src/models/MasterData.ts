import mongoose, { Document, Schema } from 'mongoose';

export interface IMasterCrop extends Document {
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMasterProduct extends Document {
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MasterCropSchema = new Schema<IMasterCrop>(
  {
    name: {
      type: String,
      required: [true, 'Crop name is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const MasterProductSchema = new Schema<IMasterProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
MasterCropSchema.index({ name: 1 }, { unique: true });
MasterCropSchema.index({ isActive: 1 });
MasterProductSchema.index({ name: 1 }, { unique: true });
MasterProductSchema.index({ isActive: 1 });

export const MasterCrop = mongoose.model<IMasterCrop>('MasterCrop', MasterCropSchema);
export const MasterProduct = mongoose.model<IMasterProduct>('MasterProduct', MasterProductSchema);

