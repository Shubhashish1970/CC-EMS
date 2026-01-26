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

export interface INonPurchaseReason extends Document {
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISentiment extends Document {
  name: string;
  colorClass: string;
  icon: string;
  displayOrder: number;
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

const NonPurchaseReasonSchema = new Schema<INonPurchaseReason>(
  {
    name: {
      type: String,
      required: [true, 'Reason name is required'],
      trim: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
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

const SentimentSchema = new Schema<ISentiment>(
  {
    name: {
      type: String,
      required: [true, 'Sentiment name is required'],
      trim: true,
    },
    colorClass: {
      type: String,
      default: 'bg-slate-100 text-slate-800',
    },
    icon: {
      type: String,
      default: 'circle',
    },
    displayOrder: {
      type: Number,
      default: 0,
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
NonPurchaseReasonSchema.index({ name: 1 }, { unique: true });
NonPurchaseReasonSchema.index({ isActive: 1, displayOrder: 1 });
SentimentSchema.index({ name: 1 }, { unique: true });
SentimentSchema.index({ isActive: 1, displayOrder: 1 });

export const MasterCrop = mongoose.model<IMasterCrop>('MasterCrop', MasterCropSchema);
export const MasterProduct = mongoose.model<IMasterProduct>('MasterProduct', MasterProductSchema);
export const NonPurchaseReason = mongoose.model<INonPurchaseReason>('NonPurchaseReason', NonPurchaseReasonSchema);
export const Sentiment = mongoose.model<ISentiment>('Sentiment', SentimentSchema);

