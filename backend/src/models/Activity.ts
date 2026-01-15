import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
  activityId: string; // FFA App activity ID
  type: string;
  date: Date;
  officerId: string;
  officerName: string;
  location: string;
  territory: string;
  state?: string; // State where activity was conducted (optional for backward compatibility)
  farmerIds: mongoose.Types.ObjectId[];
  crops: string[]; // Crops discussed in the activity
  products: string[]; // NACL products discussed in the activity
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    activityId: {
      type: String,
      required: [true, 'Activity ID is required'],
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Activity type is required'],
      enum: ['Field Day', 'Group Meeting', 'Demo Visit', 'OFM', 'Other'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Activity date is required'],
    },
    officerId: {
      type: String,
      required: [true, 'Officer ID is required'],
      trim: true,
    },
    officerName: {
      type: String,
      required: [true, 'Officer name is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    territory: {
      type: String,
      required: [true, 'Territory is required'],
      trim: true,
    },
    state: {
      type: String,
      required: false, // Optional for backward compatibility, migration will populate
      trim: true,
    },
    farmerIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Farmer',
    }],
    crops: [{
      type: String,
      trim: true,
    }],
    products: [{
      type: String,
      trim: true,
    }],
    syncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes - Optimized for 2-3 years of data (600 people × 4-5 activities/day = ~2.7M activities/3 years)
ActivitySchema.index({ activityId: 1 }, { unique: true });
ActivitySchema.index({ date: -1 }); // For date range queries and sorting by date
ActivitySchema.index({ territory: 1 }); // For territory filtering
ActivitySchema.index({ officerId: 1 }); // For officer filtering
ActivitySchema.index({ type: 1 }); // For activity type filtering
ActivitySchema.index({ type: 1, date: -1 }); // Compound: type + date for common query pattern
ActivitySchema.index({ territory: 1, date: -1 }); // Compound: territory + date for filtering
ActivitySchema.index({ state: 1 }); // For state filtering
ActivitySchema.index({ state: 1, date: -1 }); // Compound: state + date for filtering
ActivitySchema.index({ syncedAt: -1 }); // For sync monitoring
ActivitySchema.index({ farmerIds: 1 }); // For farmer lookup in activities

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);

