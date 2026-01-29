import mongoose, { Document, Schema } from 'mongoose';

export type SamplingRunStatus = 'running' | 'completed' | 'failed';
export type SamplingRunType = 'first_sample' | 'adhoc';

export interface ISamplingRun extends Document {
  createdByUserId?: mongoose.Types.ObjectId | null;
  runType: SamplingRunType; // first_sample = auto date range; adhoc = user date range
  status: SamplingRunStatus;
  startedAt: Date;
  finishedAt?: Date | null;
  filters?: {
    lifecycleStatus?: string;
    dateFrom?: Date | null;
    dateTo?: Date | null;
    samplingPercentage?: number | null;
    forceRun?: boolean;
  };
  matched: number;
  processed: number;
  tasksCreatedTotal: number;
  sampledActivities: number;
  inactiveActivities: number;
  skipped: number;
  errorCount: number;
  lastProgressAt?: Date | null;
  lastActivityId?: mongoose.Types.ObjectId | null;
  errorMessages?: string[];
}

const SamplingRunSchema = new Schema<ISamplingRun>(
  {
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    runType: {
      type: String,
      enum: ['first_sample', 'adhoc'],
      required: true,
      default: 'adhoc',
      index: true,
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      required: true,
      default: 'running',
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    filters: {
      lifecycleStatus: { type: String, default: null },
      dateFrom: { type: Date, default: null },
      dateTo: { type: Date, default: null },
      samplingPercentage: { type: Number, default: null },
      forceRun: { type: Boolean, default: false },
    },
    matched: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    tasksCreatedTotal: { type: Number, default: 0 },
    sampledActivities: { type: Number, default: 0 },
    inactiveActivities: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    lastProgressAt: { type: Date, default: null },
    lastActivityId: { type: Schema.Types.ObjectId, default: null },
    errorMessages: { type: [String], default: [] },
  },
  { timestamps: true }
);

SamplingRunSchema.index({ createdByUserId: 1, startedAt: -1 });
SamplingRunSchema.index({ createdByUserId: 1, runType: 1, startedAt: -1 }); // Last first_sample run per user

export const SamplingRun = mongoose.model<ISamplingRun>('SamplingRun', SamplingRunSchema);

