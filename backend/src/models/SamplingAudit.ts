import mongoose, { Document, Schema } from 'mongoose';

export interface ISamplingAudit extends Document {
  activityId: mongoose.Types.ObjectId;
  samplingPercentage: number;
  totalFarmers: number;
  sampledCount: number;
  algorithm: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

const SamplingAuditSchema = new Schema<ISamplingAudit>(
  {
    activityId: {
      type: Schema.Types.ObjectId,
      ref: 'Activity',
      required: [true, 'Activity ID is required'],
    },
    samplingPercentage: {
      type: Number,
      required: [true, 'Sampling percentage is required'],
      min: 0,
      max: 100,
    },
    totalFarmers: {
      type: Number,
      required: [true, 'Total farmers count is required'],
      min: 0,
    },
    sampledCount: {
      type: Number,
      required: [true, 'Sampled count is required'],
      min: 0,
    },
    algorithm: {
      type: String,
      default: 'Reservoir Sampling',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
SamplingAuditSchema.index({ activityId: 1 });
SamplingAuditSchema.index({ createdAt: -1 });

export const SamplingAudit = mongoose.model<ISamplingAudit>('SamplingAudit', SamplingAuditSchema);


