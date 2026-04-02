import mongoose from 'mongoose';
import { Activity } from '../src/models/Activity.js';
import { Farmer } from '../src/models/Farmer.js';
import { SamplingAudit } from '../src/models/SamplingAudit.js';
import { deleteDataBatch } from '../src/services/dataBatchService.js';

describe('dataBatchService.deleteDataBatch', () => {
  test('deletes activities in batch and only orphan farmers', async () => {
    const batchId = 'excel-import-test-1';

    const f1 = await Farmer.create({ name: 'F1', mobileNumber: '9000000001', location: 'Loc', preferredLanguage: 'English', territory: 'T' });
    const f2 = await Farmer.create({ name: 'F2', mobileNumber: '9000000002', location: 'Loc', preferredLanguage: 'English', territory: 'T' });

    // Batch activity references f1 and f2
    const a1 = await Activity.create({
      activityId: 'A-1',
      type: 'Field Day',
      date: new Date(),
      officerId: 'O1',
      officerName: 'Officer',
      location: 'Loc',
      territory: 'Terr',
      state: 'Telangana',
      farmerIds: [f1._id, f2._id],
      crops: [],
      products: [],
      syncedAt: new Date(),
      dataBatchId: batchId,
    });

    // Non-batch activity references f2 (so f2 must NOT be deleted)
    await Activity.create({
      activityId: 'A-2',
      type: 'Field Day',
      date: new Date(),
      officerId: 'O1',
      officerName: 'Officer',
      location: 'Loc',
      territory: 'Terr',
      state: 'Telangana',
      farmerIds: [f2._id],
      crops: [],
      products: [],
      syncedAt: new Date(),
      dataBatchId: 'sync-other',
    });

    const res = await deleteDataBatch(batchId);
    expect(res.deletedActivities).toBe(1);
    expect(res.deletedFarmers).toBe(1);

    const remainingA1 = await Activity.findById(a1._id);
    expect(remainingA1).toBeNull();

    const remainingF1 = await Farmer.findById(f1._id);
    const remainingF2 = await Farmer.findById(f2._id);
    expect(remainingF1).toBeNull();
    expect(remainingF2).not.toBeNull();
  });

  test('blocks delete when sampling audit exists for batch activity', async () => {
    const batchId = 'excel-import-test-2';

    const f1 = await Farmer.create({ name: 'F1', mobileNumber: '9000000011', location: 'Loc', preferredLanguage: 'English', territory: 'T' });
    const a1 = await Activity.create({
      activityId: 'A-10',
      type: 'Field Day',
      date: new Date(),
      officerId: 'O1',
      officerName: 'Officer',
      location: 'Loc',
      territory: 'Terr',
      state: 'Telangana',
      farmerIds: [f1._id],
      crops: [],
      products: [],
      syncedAt: new Date(),
      dataBatchId: batchId,
    });

    await SamplingAudit.create({
      activityId: a1._id as mongoose.Types.ObjectId,
      samplingPercentage: 10,
      totalFarmers: 1,
      sampledCount: 1,
      algorithm: 'Reservoir Sampling',
      metadata: {},
    });

    await expect(deleteDataBatch(batchId)).rejects.toThrow(/Sampling has run/i);
  });
});

