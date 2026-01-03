import mongoose, { Document, Schema } from 'mongoose';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'not_reachable' | 'invalid_number';
export type CallStatus = 'Connected' | 'Disconnected' | 'Not Reachable' | 'Invalid Number';

export interface ICallLog {
  timestamp: Date;
  callStatus: CallStatus;
  didAttend: boolean | null;
  didRecall: boolean | null;
  cropsDiscussed: string[];
  productsDiscussed: string[];
  hasPurchased: boolean | null;
  willingToPurchase: boolean | null;
  nonPurchaseReason: string;
  agentObservations: string;
}

export interface ICallTask extends Document {
  farmerId: mongoose.Types.ObjectId;
  activityId: mongoose.Types.ObjectId;
  status: TaskStatus;
  retryCount: number;
  assignedAgentId: mongoose.Types.ObjectId;
  scheduledDate: Date;
  callLog?: ICallLog;
  interactionHistory: Array<{
    timestamp: Date;
    status: TaskStatus;
    notes?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const CallLogSchema = new Schema<ICallLog>({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  callStatus: {
    type: String,
    enum: ['Connected', 'Disconnected', 'Not Reachable', 'Invalid Number'],
    required: true,
  },
  didAttend: {
    type: Boolean,
    default: null,
  },
  didRecall: {
    type: Boolean,
    default: null,
  },
  cropsDiscussed: {
    type: [String],
    default: [],
  },
  productsDiscussed: {
    type: [String],
    default: [],
  },
  hasPurchased: {
    type: Boolean,
    default: null,
  },
  willingToPurchase: {
    type: Boolean,
    default: null,
  },
  nonPurchaseReason: {
    type: String,
    default: '',
  },
  agentObservations: {
    type: String,
    default: '',
  },
}, { _id: false });

const InteractionHistorySchema = new Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'not_reachable', 'invalid_number'],
    required: true,
  },
  notes: {
    type: String,
    default: '',
  },
}, { _id: false });

const CallTaskSchema = new Schema<ICallTask>(
  {
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'Farmer',
      required: [true, 'Farmer ID is required'],
    },
    activityId: {
      type: Schema.Types.ObjectId,
      ref: 'Activity',
      required: [true, 'Activity ID is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'not_reachable', 'invalid_number'],
      default: 'pending',
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    assignedAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned agent ID is required'],
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    callLog: {
      type: CallLogSchema,
      default: null,
    },
    interactionHistory: {
      type: [InteractionHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CallTaskSchema.index({ status: 1, assignedAgentId: 1 });
CallTaskSchema.index({ farmerId: 1, createdAt: -1 });
CallTaskSchema.index({ scheduledDate: 1 });
CallTaskSchema.index({ activityId: 1 });

export const CallTask = mongoose.model<ICallTask>('CallTask', CallTaskSchema);

