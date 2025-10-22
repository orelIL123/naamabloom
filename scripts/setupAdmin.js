/**
 * Setup Admin User Script
 * 
 * This script helps you manually add admin users to Firestore.
 * Run this in your Firebase Console or modify for your needs.
 */

// Sample Firestore document structure for admin user
const adminUserExample = {
  uid: "USER_UID_FROM_AUTH", // Get this from Firebase Auth Console
  email: "orel895@gmail.com",
  displayName: "Orel Aharon",
  phone: "+972501234567",
  isAdmin: true,
  createdAt: new Date() // or use Firebase Timestamp
};

// New admin user for Ran Algrisi
const ranAdminUser = {
  uid: "USER_UID_FROM_AUTH", // Get this from Firebase Auth Console for ranadmin1@BARBERSBAR.COM
  email: "ranadmin1@BARBERSBAR.COM",
  displayName: "Ran Algrisi",
  phone: "+972501234567", // Update with actual phone number
  isAdmin: true,
  createdAt: new Date() // or use Firebase Timestamp
};

console.log("To set up admin users:");
console.log("\n=== Orel Aharon (orel895@gmail.com) ===");
console.log("1. Go to Firebase Console > Authentication");
console.log("2. Find user 'orel895@gmail.com' and copy the UID");
console.log("3. Go to Cloud Firestore > users collection");
console.log("4. Create/Edit a document with the UID as document ID");
console.log("5. Add the following fields:");
console.log(JSON.stringify(adminUserExample, null, 2));
console.log("\n6. Make sure isAdmin is set to: true (boolean)");
console.log("7. Save the document");

console.log("\n=== Ran Algrisi (ranadmin1@BARBERSBAR.COM) ===");
console.log("1. Go to Firebase Console > Authentication");
console.log("2. Find user 'ranadmin1@BARBERSBAR.COM' and copy the UID");
console.log("3. Go to Cloud Firestore > users collection");
console.log("4. Create/Edit a document with the UID as document ID");
console.log("5. Add the following fields:");
console.log(JSON.stringify(ranAdminUser, null, 2));
console.log("\n6. Make sure isAdmin is set to: true (boolean)");
console.log("7. Save the document");