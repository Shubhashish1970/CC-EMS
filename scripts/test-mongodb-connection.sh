#!/bin/bash
# Test MongoDB connection for the single app database: Kweka_Call_Centre
# All scripts and the app use only this database (no test/ems_call_centre).

echo "🔍 MongoDB Connection Test (Kweka_Call_Centre)"
echo "=============================================="
echo ""

if [ -z "$MONGODB_URI" ]; then
  echo "❌ MONGODB_URI not set. Set it to your Atlas URI with database Kweka_Call_Centre, e.g.:"
  echo "   export MONGODB_URI='mongodb+srv://user:pass@cluster.mongodb.net/Kweka_Call_Centre?retryWrites=true&w=majority'"
  exit 1
fi

# Ensure URI uses Kweka_Call_Centre (single database)
if [[ "$MONGODB_URI" != *"/Kweka_Call_Centre"* ]]; then
  echo "❌ MONGODB_URI must point to database Kweka_Call_Centre (single database only)."
  exit 1
fi

echo "📊 Testing database: Kweka_Call_Centre"
echo "---------------------------------------"

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
echo "=============================================="
echo "✅ Single database: Kweka_Call_Centre"
echo ""
