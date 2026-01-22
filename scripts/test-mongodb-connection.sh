#!/bin/bash
# Script to test MongoDB connections and verify which database has the correct users

echo "🔍 MongoDB Connection Test"
echo "=========================="
echo ""

BASE_URI="mongodb+srv://shubhashish_db_user:QBkSEUpsL1fLYyOV@cluster0.lmyofqz.mongodb.net"

# Test each database
for DB_NAME in "test" "Kweka_Call_Centre" "ems_call_centre"; do
  echo "📊 Testing database: $DB_NAME"
  echo "-----------------------------------"
  
  MONGODB_URI="${BASE_URI}/${DB_NAME}?retryWrites=true&w=majority"
  
  # Check if database exists and has users
  mongosh "$MONGODB_URI" --quiet --eval "
    try {
      var user = db.users.findOne({email: 'shubhashish@intelliagri.in'}, {
        email: 1, 
        role: 1, 
        isActive: 1,
        password: 1,
        _id: 0
      });
      
      if (user) {
        print('✅ User found:');
        print('  Email: ' + user.email);
        print('  Role: ' + user.role);
        print('  Active: ' + user.isActive);
        print('  Has password: ' + (user.password ? 'Yes (' + user.password.length + ' chars)' : 'No'));
      } else {
        print('❌ User shubhashish@intelliagri.in not found');
      }
      
      var totalUsers = db.users.countDocuments({});
      print('Total users in database: ' + totalUsers);
      
      if (totalUsers > 0) {
        print('All users:');
        db.users.find({}, {email: 1, role: 1, _id: 0}).forEach(function(u) {
          print('  - ' + u.email + ' (' + u.role + ')');
        });
      }
    } catch (e) {
      print('❌ Error: ' + e.message);
    }
  " 2>&1 | grep -v "Current Mongosh Log ID"
  
  echo ""
done

echo "=========================="
echo "✅ Correct database: Kweka_Call_Centre"
echo "❌ Wrong databases: test, ems_call_centre"
echo ""
echo "📝 GitHub Secret MONGODB_URI should point to:"
echo "   ${BASE_URI}/Kweka_Call_Centre?retryWrites=true&w=majority"
echo ""
