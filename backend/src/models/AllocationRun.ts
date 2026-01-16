import mongoose, { Document, Schema } from 'mongoose';

export type AllocationRunStatus = 'running' | 'completed' | 'failed';

export interface IAllocationRun extends Document {
  createdByUserId?: mongoose.Types.ObjectId | null;
  status: AllocationRunStatus;
  startedAt: Date;
  finishedAt?: Date | null;
  filters?: {
    language?: string;
    count?: number | null;
    dateFrom?: Date | null;
    dateTo?: Date | null;
  };
  total: number;
  processed: number;
  allocated: number;
  skipped: number;
  skippedByLanguage?: Record<string, number>;
  errorCount: number;
  errorMessages?: string[];
  lastProgressAt?: Date | null;
}

const AllocationRunSchema = new Schema<IAllocationRun>(
  {
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      required: true,
      default: 'running',
      index: true,
    },
    startedAt: { type: Date, required: true, default: Date.now, index: true },
    finishedAt: { type: Date, default: null },
    filters: {
      language: { type: String, default: null },
      count: { type: Number, default: null },
      dateFrom: { type: Date, default: null },
      dateTo: { type: Date, default: null },
    },
    total: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    allocated: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    skippedByLanguage: { type: Schema.Types.Mixed, default: {} },
    errorCount: { type: Number, default: 0 },
    errorMessages: { type: [String], default: [] },
    lastProgressAt: { type: Date, default: null },
  },
  { timestamps: true }
);

AllocationRunSchema.index({ createdByUserId: 1, startedAt: -1 });

export const AllocationRun = mongoose.model<IAllocationRun>('AllocationRun', AllocationRunSchema);

