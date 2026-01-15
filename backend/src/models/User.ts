import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'cc_agent' | 'team_lead' | 'mis_admin' | 'core_sales_head' | 'marketing_head';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId: string;
  languageCapabilities: string[];
  assignedTerritories: string[];
  teamLeadId?: mongoose.Types.ObjectId; // For cc_agent role - points to team_lead user
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // Don't return password in queries by default
    },
    role: {
      type: String,
      enum: ['cc_agent', 'team_lead', 'mis_admin', 'core_sales_head', 'marketing_head'],
      required: [true, 'Role is required'],
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    languageCapabilities: {
      type: [String],
      default: [],
      enum: ['Hindi', 'Telugu', 'Marathi', 'Kannada', 'Tamil', 'Bengali', 'Oriya', 'English', 'Malayalam'],
    },
    assignedTerritories: {
      type: [String],
      default: [],
    },
    teamLeadId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (email and employeeId already have unique: true, so no need to index again)
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ teamLeadId: 1 });

// Virtual for team members (for team_lead role)
UserSchema.virtual('teamMembers', {
  ref: 'User',
  localField: '_id',
  foreignField: 'teamLeadId',
});

export const User = mongoose.model<IUser>('User', UserSchema);

