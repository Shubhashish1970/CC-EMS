import mongoose, { Document, Schema } from 'mongoose';

export type TaskStatus =
  | 'unassigned'
  | 'sampled_in_queue'
  | 'in_progress'
  | 'completed'
  | 'not_reachable'
  | 'invalid_number';
export type CallStatus =
  | 'Connected'
  | 'Disconnected'
  | 'Incoming N/A'
  | 'No Answer'
  | 'Invalid'
  // Backward-compatible legacy values stored previously
  | 'Not Reachable'
  | 'Invalid Number';

export interface ICallLog {
  timestamp: Date;
  callStatus: CallStatus;
  callDurationSeconds?: number; // captured for analytics (connected calls)
  didAttend: string | null; // Changed from boolean to string enum
  didRecall: boolean | null;
  cropsDiscussed: string[];
  productsDiscussed: string[];
  hasPurchased: boolean | null;
  willingToPurchase: boolean | null;
  likelyPurchaseDate: string;
  nonPurchaseReason: string;
  purchasedProducts: Array<{ product: string; quantity: string; unit: string }>;
  farmerComments: string; // Replaces agentObservations
  sentiment: 'Positive' | 'Negative' | 'Neutral' | 'N/A'; // Sentiment indicator
}

export interface ICallTask extends Document {
  farmerId: mongoose.Types.ObjectId;
  activityId: mongoose.Types.ObjectId;
  status: TaskStatus;
  retryCount: number;
  assignedAgentId?: mongoose.Types.ObjectId | null;
  scheduledDate: Date;
  callStartedAt?: Date | null;
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
    enum: ['Connected', 'Disconnected', 'Incoming N/A', 'No Answer', 'Invalid', 'Not Reachable', 'Invalid Number'],
    required: true,
  },
  callDurationSeconds: {
    type: Number,
    default: 0,
  },
  didAttend: {
    type: String,
    enum: ['Yes, I attended', 'No, I missed', "Don't recall", 'Identity Wrong', 'Not a Farmer', null],
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
  likelyPurchaseDate: {
    type: String,
    default: '',
  },
  nonPurchaseReason: {
    type: String,
    default: '',
  },
  purchasedProducts: {
    type: [
      {
        product: { type: String, default: '' },
        quantity: { type: String, default: '' },
        unit: { type: String, default: 'kg' },
      },
    ],
    default: [],
  },
  farmerComments: {
    type: String,
    default: '',
  },
  sentiment: {
    type: String,
    enum: ['Positive', 'Negative', 'Neutral', 'N/A'],
    default: 'N/A',
  },
}, { _id: false });

const InteractionHistorySchema = new Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['unassigned', 'sampled_in_queue', 'in_progress', 'completed', 'not_reachable', 'invalid_number'],
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
      enum: ['unassigned', 'sampled_in_queue', 'in_progress', 'completed', 'not_reachable', 'invalid_number'],
      default: 'unassigned',
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    assignedAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    callStartedAt: {
      type: Date,
      default: null,
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

// Indexes - Optimized for 2-3 years of data (~19M tasks over 3 years)
CallTaskSchema.index({ status: 1, assignedAgentId: 1 }); // For agent queue queries
CallTaskSchema.index({ farmerId: 1, createdAt: -1 }); // For farmer history
CallTaskSchema.index({ scheduledDate: 1 }); // For chronological ordering
CallTaskSchema.index({ activityId: 1 }); // For activity-based queries
CallTaskSchema.index({ assignedAgentId: 1, status: 1, scheduledDate: 1 }); // Compound: agent queue with status and date
CallTaskSchema.index({ activityId: 1, farmerId: 1 }, { unique: true }); // UNIQUE: Prevent duplicate tasks for same farmer+activity
CallTaskSchema.index({ createdAt: -1 }); // For recent tasks
CallTaskSchema.index({ status: 1, scheduledDate: 1 }); // Compound: status + scheduled date for filtering
CallTaskSchema.index({ status: 1, scheduledDate: 1, createdAt: -1 }); // For unassigned management

export const CallTask = mongoose.model<ICallTask>('CallTask', CallTaskSchema);


