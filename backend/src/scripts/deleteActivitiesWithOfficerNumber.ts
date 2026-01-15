import mongoose from 'mongoose';
import { Activity } from '../models/Activity.js';
import { CallTask } from '../models/CallTask.js';
import { SamplingAudit } from '../models/SamplingAudit.js';

/**
 * Deletes activities that look like bad/test data where:
 * - FDA/officer is "Officer <number>" OR
 * - location is "Location <number>"
 *
 * Safety:
 * - Defaults to DRY RUN.
 * - Pass --yes to actually delete.
 *
 * Also deletes dependent:
 * - call_tasks referencing those activityIds
 * - sampling_audit rows referencing those activityIds
 *
 * Usage:
 *   MONGODB_URI="..." npm --prefix backend run cleanup:officer-number-activities -- --yes
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems_call_centre';

const args = process.argv.slice(2);
const isYes = args.includes('--yes');

// Match values like:
// - "Officer 1"
// - "Officer: Officer 2"
// - "Location 3"
const OFFICER_NUMBER_REGEX = /^\s*(?:Officer\s*:\s*)?Officer\s+\d+\s*$/i;
const LOCATION_NUMBER_REGEX = /^\s*Location\s+\d+\s*$/i;

async function main() {
  console.log(`🔌 Connecting to MongoDB...`);
  await mongoose.connect(MONGODB_URI);
  console.log(`✅ Connected`);
  console.log(`🔎 Connected DB: ${mongoose.connection.name} @ ${mongoose.connection.host}`);

  const activities = await Activity.find(
    {
      $or: [
        { officerName: { $regex: OFFICER_NUMBER_REGEX } },
        { location: { $regex: LOCATION_NUMBER_REGEX } },
      ],
    },
    { _id: 1, activityId: 1, officerName: 1, location: 1, date: 1 }
  ).lean();

  console.log(`\n🔍 Matched activities: ${activities.length}`);
  const preview = activities.slice(0, 20);
  if (preview.length > 0) {
    console.log(`Preview (first ${preview.length}):`);
    for (const a of preview) {
      console.log(`- ${a._id} | ${a.activityId} | ${a.officerName} | ${a.location} | ${new Date(a.date as any).toISOString()}`);
    }
  }

  const activityIds = activities.map(a => a._id);
  const tasksCount = await CallTask.countDocuments({ activityId: { $in: activityIds } });
  const auditsCount = await SamplingAudit.countDocuments({ activityId: { $in: activityIds } });

  console.log(`\n📊 Impact:`);
  console.log(`- activities to delete: ${activities.length}`);
  console.log(`- call_tasks to delete: ${tasksCount}`);
  console.log(`- sampling_audit to delete: ${auditsCount}`);

  if (!isYes) {
    console.log(`\n🟡 DRY RUN (no deletions). Re-run with --yes to delete.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`\n🧨 Deleting...`);

  const taskDel = await CallTask.deleteMany({ activityId: { $in: activityIds } });
  const auditDel = await SamplingAudit.deleteMany({ activityId: { $in: activityIds } });
  const activityDel = await Activity.deleteMany({ _id: { $in: activityIds } });

  console.log(`✅ Deleted call_tasks: ${taskDel.deletedCount}`);
  console.log(`✅ Deleted sampling_audit: ${auditDel.deletedCount}`);
  console.log(`✅ Deleted activities: ${activityDel.deletedCount}`);

  await mongoose.disconnect();
  console.log(`✅ Done`);
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Error:', err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});

