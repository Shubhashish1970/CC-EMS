import mongoose, { Document, Schema } from 'mongoose';

export type ActivityLifecycleStatus = 'active' | 'sampled' | 'inactive' | 'not_eligible';

export interface ISamplingConfig extends Document {
  key: 'default';
  isActive: boolean;
  activityCoolingDays: number;
  farmerCoolingDays: number;
  defaultPercentage: number;
  activityTypePercentages: Record<string, number>;
  eligibleActivityTypes: string[]; // empty => all eligible
  updatedByUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SamplingConfigSchema = new Schema<ISamplingConfig>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'default',
      enum: ['default'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    activityCoolingDays: {
      type: Number,
      required: true,
      default: 5,
      min: 0,
      max: 365,
    },
    farmerCoolingDays: {
      type: Number,
      required: true,
      default: 30,
      min: 0,
      max: 365,
    },
    defaultPercentage: {
      type: Number,
      required: true,
      default: 10,
      min: 1,
      max: 100,
    },
    activityTypePercentages: {
      type: Schema.Types.Mixed,
      default: {},
    },
    eligibleActivityTypes: {
      type: [String],
      default: [],
    },
    updatedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

SamplingConfigSchema.index({ key: 1 }, { unique: true });
SamplingConfigSchema.index({ isActive: 1 });

export const SamplingConfig = mongoose.model<ISamplingConfig>('SamplingConfig', SamplingConfigSchema);

