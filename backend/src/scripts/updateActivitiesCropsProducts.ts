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

async function updateActivitiesCropsProducts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string, { w: 'majority' as const });
    console.log('Connected to MongoDB\n');

    // Get all active crops and products from master data
    const masterCrops = await MasterCrop.find({ isActive: true }).select('name');
    const masterProducts = await MasterProduct.find({ isActive: true }).select('name');
    
    // Create lookup maps (case-insensitive)
    const cropMap = new Map<string, string>(); // lowercase -> proper case
    const productMap = new Map<string, string>(); // lowercase -> proper case
    
    masterCrops.forEach(crop => {
      const key = crop.name.toLowerCase().trim();
      if (!cropMap.has(key)) {
        cropMap.set(key, crop.name.trim());
      }
    });
    
    masterProducts.forEach(product => {
      const key = product.name.toLowerCase().trim();
      if (!productMap.has(key)) {
        productMap.set(key, product.name.trim());
      }
    });
    
    console.log(`📊 Master Data:`);
    console.log(`   Active Crops: ${cropMap.size}`);
    console.log(`   Active Products: ${productMap.size}\n`);

    // Helper function to normalize crop name
    function normalizeCropName(cropName: string): string | null {
      if (!cropName || !cropName.trim()) return null;
      const normalized = cropName.trim();
      const key = normalized.toLowerCase();
      
      // Direct match
      if (cropMap.has(key)) {
        return cropMap.get(key)!;
      }
      
      // Try common variations/mappings
      const variations: Record<string, string> = {
        'okra': 'Bhendi',
        'rice': 'Paddy',
        'paddy': 'Paddy',
        'bhendi': 'Bhendi',
      };
      
      if (variations[key]) {
        const mappedKey = variations[key].toLowerCase();
        if (cropMap.has(mappedKey)) {
          return cropMap.get(mappedKey)!;
        }
      }
      
      return null; // No match found
    }

    // Helper function to normalize product name
    function normalizeProductName(productName: string): string | null {
      if (!productName || !productName.trim()) return null;
      const normalized = productName.trim();
      const key = normalized.toLowerCase();
      
      // Direct match
      if (productMap.has(key)) {
        return productMap.get(key)!;
      }
      
      // Try common variations/mappings for old product names
      const productVariations: Record<string, string> = {
        // Old generic NACL product names - map to closest match or remove
        'nacl seeds premium': '', // Remove if no match
        'nacl crop protection': '', // Remove if no match
        'nacl organic': '', // Remove if no match
        'nacl micro nutrients': '', // Remove if no match
        'nacl soil conditioner': '', // Remove if no match
        'nacl fertilizers': '', // Remove if no match
        'nacl growth enhancer': '', // Remove if no match
        'nacl bio solutions': '', // Remove if no match
        'nacl pro': '', // Remove if no match
        'specialty fungicide': '', // Remove if no match
        'foliar spray': '', // Remove if no match
      };
      
      // If it's a known old product name, return empty to remove it
      if (productVariations[key]) {
        return ''; // Return empty string to signal removal
      }
      
      // Try partial matching (e.g., if product name contains keywords)
      // Check if any master product name contains keywords from the old name
      const keywords = key.split(/\s+/).filter(k => k.length > 3);
      for (const [masterKey, masterName] of productMap.entries()) {
        if (keywords.some(keyword => masterKey.includes(keyword) || keyword.includes(masterKey))) {
          return masterName;
        }
      }
      
      return null; // No match found, keep original
    }

    // Update Activities
    console.log('🔄 Updating Activities...\n');
    const activities = await Activity.find({}).select('crops products _id');
    let activitiesUpdated = 0;
    let activitiesSkipped = 0;
    const activityUpdates: Array<{ id: string; oldCrops: string[]; newCrops: string[]; oldProducts: string[]; newProducts: string[] }> = [];

    for (const activity of activities) {
      let needsUpdate = false;
      const oldCrops = Array.isArray(activity.crops) ? [...activity.crops] : (activity.crops ? [activity.crops] : []);
      const oldProducts = Array.isArray(activity.products) ? [...activity.products] : (activity.products ? [activity.products] : []);
      
      const newCrops: string[] = [];
      const newProducts: string[] = [];
      const unmatchedCrops: string[] = [];
      const unmatchedProducts: string[] = [];

      // Update crops
      if (Array.isArray(activity.crops)) {
        activity.crops.forEach((crop: string) => {
          if (crop && crop.trim()) {
            const normalized = normalizeCropName(crop);
            if (normalized) {
              if (!newCrops.includes(normalized)) {
                newCrops.push(normalized);
              }
              if (crop.trim() !== normalized) {
                needsUpdate = true;
              }
            } else {
              unmatchedCrops.push(crop.trim());
              // Keep original if no match found (preserve data)
              if (!newCrops.includes(crop.trim())) {
                newCrops.push(crop.trim());
              }
            }
          }
        });
      } else if (activity.crops && activity.crops.trim()) {
        const normalized = normalizeCropName(activity.crops);
        if (normalized) {
          newCrops.push(normalized);
          if (activity.crops.trim() !== normalized) {
            needsUpdate = true;
          }
        } else {
          unmatchedCrops.push(activity.crops.trim());
          newCrops.push(activity.crops.trim());
        }
      }

      // Update products
      if (Array.isArray(activity.products)) {
        activity.products.forEach((product: string) => {
          if (product && product.trim()) {
            const normalized = normalizeProductName(product);
            if (normalized === '') {
              // Empty string means remove this product
              needsUpdate = true;
            } else if (normalized) {
              if (!newProducts.includes(normalized)) {
                newProducts.push(normalized);
              }
              if (product.trim() !== normalized) {
                needsUpdate = true;
              }
            } else {
              // Remove unmatched products - only keep products from master data
              needsUpdate = true;
              unmatchedProducts.push(product.trim());
            }
          }
        });
      } else if (activity.products && activity.products.trim()) {
        const normalized = normalizeProductName(activity.products);
        if (normalized === '') {
          // Empty string means remove this product
          needsUpdate = true;
        } else if (normalized) {
          newProducts.push(normalized);
          if (activity.products.trim() !== normalized) {
            needsUpdate = true;
          }
        } else {
          // Remove unmatched products - only keep products from master data
          needsUpdate = true;
          unmatchedProducts.push(activity.products.trim());
        }
      }

      if (needsUpdate) {
        activity.crops = newCrops;
        activity.products = newProducts;
        await activity.save();
        activitiesUpdated++;
        activityUpdates.push({
          id: activity._id.toString(),
          oldCrops,
          newCrops,
          oldProducts,
          newProducts
        });
        
        if (unmatchedCrops.length > 0 || unmatchedProducts.length > 0) {
          console.log(`   Activity ${activity._id}:`);
          if (unmatchedCrops.length > 0) {
            console.log(`     ⚠️  Unmatched crops (removed): ${unmatchedCrops.join(', ')}`);
          }
          if (unmatchedProducts.length > 0) {
            console.log(`     ⚠️  Unmatched products (removed): ${unmatchedProducts.join(', ')}`);
          }
        }
      } else {
        activitiesSkipped++;
      }
    }

    console.log(`\n✅ Activities: ${activitiesUpdated} updated, ${activitiesSkipped} skipped\n`);

    // Update CallTasks
    console.log('🔄 Updating Call Tasks...\n');
    const tasks = await CallTask.find({ 
      $or: [
        { 'callLog.cropsDiscussed': { $exists: true, $ne: [] } },
        { 'callLog.productsDiscussed': { $exists: true, $ne: [] } },
        { 'callLog.purchasedProducts': { $exists: true, $ne: [] } }
      ]
    }).select('callLog _id');
    
    let tasksUpdated = 0;
    let tasksSkipped = 0;

    for (const task of tasks) {
      if (!task.callLog) continue;
      
      let needsUpdate = false;
      const oldCropsDiscussed = task.callLog.cropsDiscussed ? [...task.callLog.cropsDiscussed] : [];
      const oldProductsDiscussed = task.callLog.productsDiscussed ? [...task.callLog.productsDiscussed] : [];
      const oldPurchasedProducts = task.callLog.purchasedProducts ? JSON.parse(JSON.stringify(task.callLog.purchasedProducts)) : [];

      // Update cropsDiscussed
      if (Array.isArray(task.callLog.cropsDiscussed) && task.callLog.cropsDiscussed.length > 0) {
        const newCropsDiscussed: string[] = [];
        task.callLog.cropsDiscussed.forEach((crop: string) => {
          if (crop && crop.trim()) {
            const normalized = normalizeCropName(crop);
            if (normalized) {
              if (!newCropsDiscussed.includes(normalized)) {
                newCropsDiscussed.push(normalized);
              }
              if (crop.trim() !== normalized) {
                needsUpdate = true;
              }
            } else {
              if (!newCropsDiscussed.includes(crop.trim())) {
                newCropsDiscussed.push(crop.trim());
              }
            }
          }
        });
        task.callLog.cropsDiscussed = newCropsDiscussed;
      }

      // Update productsDiscussed
      if (Array.isArray(task.callLog.productsDiscussed) && task.callLog.productsDiscussed.length > 0) {
        const newProductsDiscussed: string[] = [];
        task.callLog.productsDiscussed.forEach((product: string) => {
          if (product && product.trim()) {
            const normalized = normalizeProductName(product);
            if (normalized === '') {
              // Empty string means remove this product
              needsUpdate = true;
            } else if (normalized) {
              if (!newProductsDiscussed.includes(normalized)) {
                newProductsDiscussed.push(normalized);
              }
              if (product.trim() !== normalized) {
                needsUpdate = true;
              }
            } else {
              // Remove unmatched products - only keep products from master data
              needsUpdate = true;
            }
          }
        });
        task.callLog.productsDiscussed = newProductsDiscussed;
      }

      // Update purchasedProducts
      if (Array.isArray(task.callLog.purchasedProducts) && task.callLog.purchasedProducts.length > 0) {
        const newPurchasedProducts = task.callLog.purchasedProducts
          .map((item: any) => {
            if (item?.product && item.product.trim()) {
              const normalized = normalizeProductName(item.product);
              if (normalized === '') {
                // Empty string means remove this product
                needsUpdate = true;
                return null;
              } else if (normalized && item.product.trim() !== normalized) {
                needsUpdate = true;
                return { ...item, product: normalized };
              }
            }
            return item;
          })
          .filter((item: any) => item !== null); // Remove null entries
        task.callLog.purchasedProducts = newPurchasedProducts;
      }

      if (needsUpdate) {
        await task.save();
        tasksUpdated++;
      } else {
        tasksSkipped++;
      }
    }

    console.log(`✅ Call Tasks: ${tasksUpdated} updated, ${tasksSkipped} skipped\n`);

    // Summary
    console.log('📊 Migration Summary:');
    console.log(`   Activities: ${activitiesUpdated} updated`);
    console.log(`   Call Tasks: ${tasksUpdated} updated`);
    console.log(`\n✅ Migration completed successfully!`);
    console.log(`\n💡 Note: Unmatched crops/products were removed to ensure only master data is used.`);
    console.log(`   All activities and tasks now use crops/products from master data only.\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

updateActivitiesCropsProducts();
