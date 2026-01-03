import mongoose, { Document, Schema } from 'mongoose';

export type QueryType = 'Product usage' | 'Complaint' | 'General inquiry';
export type QueryStatus = 'open' | 'in_progress' | 'resolved' | 'escalated';
export type EscalationLevel = 'Level 1' | 'Level 2';

export interface IInboundQuery extends Document {
  farmerId?: mongoose.Types.ObjectId;
  queryType: QueryType;
  category: string;
  description: string;
  status: QueryStatus;
  assignedTo?: mongoose.Types.ObjectId;
  escalationLevel: EscalationLevel;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InboundQuerySchema = new Schema<IInboundQuery>(
  {
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'Farmer',
      default: null,
    },
    queryType: {
      type: String,
      enum: ['Product usage', 'Complaint', 'General inquiry'],
      required: [true, 'Query type is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'escalated'],
      default: 'open',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    escalationLevel: {
      type: String,
      enum: ['Level 1', 'Level 2'],
      default: 'Level 1',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
InboundQuerySchema.index({ status: 1 });
InboundQuerySchema.index({ assignedTo: 1 });
InboundQuerySchema.index({ createdAt: -1 });
InboundQuerySchema.index({ escalationLevel: 1 });

export const InboundQuery = mongoose.model<IInboundQuery>('InboundQuery', InboundQuerySchema);

