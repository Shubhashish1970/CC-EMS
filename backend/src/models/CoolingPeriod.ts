import mongoose, { Document, Schema } from 'mongoose';

export interface ICoolingPeriod extends Document {
  farmerId: mongoose.Types.ObjectId;
  lastCallDate: Date;
  coolingPeriodDays: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CoolingPeriodSchema = new Schema<ICoolingPeriod>(
  {
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'Farmer',
      required: [true, 'Farmer ID is required'],
      unique: true,
    },
    lastCallDate: {
      type: Date,
      required: [true, 'Last call date is required'],
    },
    coolingPeriodDays: {
      type: Number,
      required: [true, 'Cooling period days is required'],
      default: 30, // Default 30 days cooling period
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expires at date is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes - Optimized for 2-3 years of data (~6M+ cooling periods over 3 years)
CoolingPeriodSchema.index({ farmerId: 1 }, { unique: true }); // Unique: one cooling period per farmer
CoolingPeriodSchema.index({ expiresAt: 1 }); // For expiry queries and cleanup
CoolingPeriodSchema.index({ farmerId: 1, expiresAt: 1 }); // Compound: farmer + expiry for eligibility checks
// Note: TTL index not used - we manually check expiry in queries for better control

// Auto-calculate expiresAt before save
CoolingPeriodSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('lastCallDate') || this.isModified('coolingPeriodDays')) {
    const expiresAt = new Date(this.lastCallDate);
    expiresAt.setDate(expiresAt.getDate() + this.coolingPeriodDays);
    this.expiresAt = expiresAt;
  }
  next();
});

export const CoolingPeriod = mongoose.model<ICoolingPeriod>('CoolingPeriod', CoolingPeriodSchema);


