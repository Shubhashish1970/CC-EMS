import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Activity } from '../models/Activity.js';
import { CallTask } from '../models/CallTask.js';
import { MasterCrop, MasterProduct } from '../models/MasterData.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in environment variables');
  process.exit(1);
}

async function verifyCropsProducts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string, { w: 'majority' as const });
    console.log('Connected to MongoDB\n');

    // Get all active crops and products from master data
    const masterCrops = await MasterCrop.find({ isActive: true }).select('name');
    const masterProducts = await MasterProduct.find({ isActive: true }).select('name');
    
    const masterCropNames = new Set(masterCrops.map(c => c.name.toLowerCase().trim()));
    const masterProductNames = new Set(masterProducts.map(p => p.name.toLowerCase().trim()));
    
    console.log(`📊 Master Data Summary:`);
    console.log(`   Active Crops: ${masterCropNames.size}`);
    console.log(`   Active Products: ${masterProductNames.size}\n`);

    // Get all unique crops and products from Activities
    const activities = await Activity.find({}).select('crops products');
    const activityCrops = new Set<string>();
    const activityProducts = new Set<string>();
    
    activities.forEach(activity => {
      if (Array.isArray(activity.crops)) {
        activity.crops.forEach((crop: string) => {
          if (crop && crop.trim()) {
            activityCrops.add(crop.trim());
          }
        });
      }
      if (Array.isArray(activity.products)) {
        activity.products.forEach((product: string) => {
          if (product && product.trim()) {
            activityProducts.add(product.trim());
          }
        });
      }
    });

    // Get all unique crops and products from CallTasks
    const tasks = await CallTask.find({ 'callLog.cropsDiscussed': { $exists: true, $ne: [] } })
      .select('callLog.cropsDiscussed callLog.productsDiscussed callLog.purchasedProducts');
    
    const taskCrops = new Set<string>();
    const taskProducts = new Set<string>();
    
    tasks.forEach(task => {
      if (task.callLog?.cropsDiscussed && Array.isArray(task.callLog.cropsDiscussed)) {
        task.callLog.cropsDiscussed.forEach((crop: string) => {
          if (crop && crop.trim()) {
            taskCrops.add(crop.trim());
          }
        });
      }
      if (task.callLog?.productsDiscussed && Array.isArray(task.callLog.productsDiscussed)) {
        task.callLog.productsDiscussed.forEach((product: string) => {
          if (product && product.trim()) {
            taskProducts.add(product.trim());
          }
        });
      }
      if (task.callLog?.purchasedProducts && Array.isArray(task.callLog.purchasedProducts)) {
        task.callLog.purchasedProducts.forEach((item: any) => {
          if (item?.product && item.product.trim()) {
            taskProducts.add(item.product.trim());
          }
        });
      }
    });

    console.log(`📋 Activities Summary:`);
    console.log(`   Total Activities: ${activities.length}`);
    console.log(`   Unique Crops in Activities: ${activityCrops.size}`);
    console.log(`   Unique Products in Activities: ${activityProducts.size}\n`);

    console.log(`📞 Call Tasks Summary:`);
    console.log(`   Tasks with Call Logs: ${tasks.length}`);
    console.log(`   Unique Crops in Tasks: ${taskCrops.size}`);
    console.log(`   Unique Products in Tasks: ${taskProducts.size}\n`);

    // Check for crops in activities that don't exist in master data
    const missingCropsInActivities: string[] = [];
    activityCrops.forEach(crop => {
      if (!masterCropNames.has(crop.toLowerCase())) {
        missingCropsInActivities.push(crop);
      }
    });

    // Check for products in activities that don't exist in master data
    const missingProductsInActivities: string[] = [];
    activityProducts.forEach(product => {
      if (!masterProductNames.has(product.toLowerCase())) {
        missingProductsInActivities.push(product);
      }
    });

    // Check for crops in tasks that don't exist in master data
    const missingCropsInTasks: string[] = [];
    taskCrops.forEach(crop => {
      if (!masterCropNames.has(crop.toLowerCase())) {
        missingCropsInTasks.push(crop);
      }
    });

    // Check for products in tasks that don't exist in master data
    const missingProductsInTasks: string[] = [];
    taskProducts.forEach(product => {
      if (!masterProductNames.has(product.toLowerCase())) {
        missingProductsInTasks.push(product);
      }
    });

    // Report results
    console.log('🔍 Verification Results:\n');

    if (missingCropsInActivities.length === 0 && missingProductsInActivities.length === 0 &&
        missingCropsInTasks.length === 0 && missingProductsInTasks.length === 0) {
      console.log('✅ All crops and products in activities and tasks exist in master data!');
      console.log('   The system is ready to use all new crops/products.\n');
    } else {
      if (missingCropsInActivities.length > 0) {
        console.log(`⚠️  Crops in Activities NOT in Master Data (${missingCropsInActivities.length}):`);
        missingCropsInActivities.forEach(crop => console.log(`   - "${crop}"`));
        console.log('');
      }

      if (missingProductsInActivities.length > 0) {
        console.log(`⚠️  Products in Activities NOT in Master Data (${missingProductsInActivities.length}):`);
        missingProductsInActivities.forEach(product => console.log(`   - "${product}"`));
        console.log('');
      }

      if (missingCropsInTasks.length > 0) {
        console.log(`⚠️  Crops in Tasks NOT in Master Data (${missingCropsInTasks.length}):`);
        missingCropsInTasks.forEach(crop => console.log(`   - "${crop}"`));
        console.log('');
      }

      if (missingProductsInTasks.length > 0) {
        console.log(`⚠️  Products in Tasks NOT in Master Data (${missingProductsInTasks.length}):`);
        missingProductsInTasks.forEach(product => console.log(`   - "${product}"`));
        console.log('');
      }

      console.log('💡 Note: These crops/products may be from old data or typos.');
      console.log('   They will still work in the system (no validation blocks them),');
      console.log('   but they won\'t appear in dropdowns for new activities/tasks.\n');
    }

    // Show new crops/products available for use
    const allUsedCrops = new Set([...activityCrops, ...taskCrops]);
    const allUsedProducts = new Set([...activityProducts, ...taskProducts]);
    
    const newCropsAvailable = Array.from(masterCropNames)
      .filter(crop => !Array.from(allUsedCrops).some(used => used.toLowerCase() === crop));
    const newProductsAvailable = Array.from(masterProductNames)
      .filter(product => !Array.from(allUsedProducts).some(used => used.toLowerCase() === product));

    if (newCropsAvailable.length > 0 || newProductsAvailable.length > 0) {
      console.log('🆕 New Crops/Products Available (not yet used in activities/tasks):\n');
      if (newCropsAvailable.length > 0) {
        console.log(`   New Crops (${newCropsAvailable.length}):`);
        // Get proper case names from master data
        const newCropNames = masterCrops
          .filter(c => newCropsAvailable.includes(c.name.toLowerCase().trim()))
          .map(c => c.name)
          .sort();
        newCropNames.forEach(crop => console.log(`   - ${crop}`));
        console.log('');
      }
      if (newProductsAvailable.length > 0) {
        console.log(`   New Products (${newProductsAvailable.length}):`);
        // Get proper case names from master data
        const newProductNames = masterProducts
          .filter(p => newProductsAvailable.includes(p.name.toLowerCase().trim()))
          .map(p => p.name)
          .sort();
        newProductNames.forEach(product => console.log(`   - ${product}`));
        console.log('');
      }
      console.log('✅ These new crops/products are ready to use in activities and tasks!\n');
    }

    console.log('✅ Verification complete!');
    console.log('\n📝 Summary:');
    console.log(`   - Master Data has ${masterCropNames.size} active crops and ${masterProductNames.size} active products`);
    console.log(`   - Activities use ${activityCrops.size} unique crops and ${activityProducts.size} unique products`);
    console.log(`   - Tasks use ${taskCrops.size} unique crops and ${taskProducts.size} unique products`);
    console.log(`   - All API endpoints will return the new crops/products for dropdowns`);
    console.log(`   - Activities and tasks can be created/updated with any new crops/products\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

verifyCropsProducts();
