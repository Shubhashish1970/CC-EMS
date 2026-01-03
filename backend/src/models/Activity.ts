import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
  activityId: string; // FFA App activity ID
  type: string;
  date: Date;
  officerId: string;
  officerName: string;
  location: string;
  territory: string;
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

// Indexes
ActivitySchema.index({ activityId: 1 }, { unique: true });
ActivitySchema.index({ date: -1 });
ActivitySchema.index({ territory: 1 });
ActivitySchema.index({ officerId: 1 });

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);

