const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp, setDoc, doc } = require('firebase/firestore');

console.log('🔧 Starting new barbers addition script...');

// Firebase configuration for Barbers Bar
const firebaseConfig = {
  apiKey: "AIzaSyD7p1xfunf3eiUIbP1KtcSQZ_GwBu4KnTc",
  authDomain: "barbers-bar-ae31f.firebaseapp.com",
  projectId: "barbers-bar-ae31f",
  storageBucket: "barbers-bar-ae31f.firebasestorage.app",
  messagingSenderId: "53851377123",
  appId: "1:53851377123:web:02bace959447ce8e6a24d6",
  measurementId: "G-RJMV6ZS6T0"
};

console.log('📡 Initializing Firebase...');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('✅ Firebase initialized successfully');

const addNewBarbers = async () => {
  try {
    console.log('🚀 Adding new barbers to Firebase...');
    
    // New barbers data with pricing from the requirements
    const newBarbersData = [
      {
        name: "אופק אלגריסי",
        image: "",
        specialties: ["תספורת מקצועית", "עיצוב זקן", "טיפוח גברי"],
        experience: "5 שנות ניסיון",
        rating: 4.8,
        available: true,
        phone: "+972501234570",
        photoUrl: "",
        bio: "ספר מקצועי עם ניסיון וידע רב בתחום התספורות",
        pricing: {},
        hourlyRate: 70,
        role: "barber", // Role for permission system
        permissions: {
          canManageOwnAvailability: true,
          canViewOwnAppointments: true,
          canManageOwnAppointments: true,
          canViewStatistics: true,
          canManageAllBarbers: false,
          canManageSettings: false,
          canManageUsers: false
        }
      },
      {
        name: "לידור פלקה",
        image: "",
        specialties: ["תספורת מודרנית", "עיצוב שיער", "גילוח"],
        experience: "4 שנות ניסיון",
        rating: 4.7,
        available: true,
        phone: "+972501234571",
        photoUrl: "",
        bio: "ספר צעיר ומוכשר עם גישה מודרנית לתספורות",
        pricing: {},
        hourlyRate: 60,
        role: "barber",
        permissions: {
          canManageOwnAvailability: true,
          canViewOwnAppointments: true,
          canManageOwnAppointments: true,
          canViewStatistics: true,
          canManageAllBarbers: false,
          canManageSettings: false,
          canManageUsers: false
        }
      },
      {
        name: "בן הרוש",
        image: "",
        specialties: ["תספורת קלאסית", "טיפוח זקן", "גילוח מסורתי"],
        experience: "3 שנות ניסיון",
        rating: 4.6,
        available: true,
        phone: "+972501234572",
        photoUrl: "",
        bio: "ספר עם התמחות בתספורות קלאסיות וגילוח מסורתי",
        pricing: {},
        hourlyRate: 50,
        role: "barber",
        permissions: {
          canManageOwnAvailability: true,
          canViewOwnAppointments: true,
          canManageOwnAppointments: true,
          canViewStatistics: true,
          canManageAllBarbers: false,
          canManageSettings: false,
          canManageUsers: false
        }
      },
      {
        name: "אריאל גולן",
        image: "",
        specialties: ["תספורת ילדים", "תספורת משפחתית", "עיצוב שיער"],
        experience: "3 שנות ניסיון",
        rating: 4.5,
        available: true,
        phone: "+972501234573",
        photoUrl: "",
        bio: "ספר המתמחה בתספורות ילדים ושירות משפחתי",
        pricing: {},
        hourlyRate: 50,
        role: "barber",
        permissions: {
          canManageOwnAvailability: true,
          canViewOwnAppointments: true,
          canManageOwnAppointments: true,
          canViewStatistics: true,
          canManageAllBarbers: false,
          canManageSettings: false,
          canManageUsers: false
        }
      }
    ];

    const barberIds = [];
    for (const barber of newBarbersData) {
      const docRef = await addDoc(collection(db, 'barbers'), {
        ...barber,
        createdAt: Timestamp.now()
      });
      barberIds.push(docRef.id);
      console.log(`✅ Added barber: ${barber.name} (ID: ${docRef.id})`);
    }

    // Create user accounts for each barber
    console.log('👥 Creating user accounts for new barbers...');
    const barberUsers = [
      {
        uid: `barber-${barberIds[0]}`,
        email: "ofek.algarisi@barbersbar.com",
        displayName: "אופק אלגריסי",
        phone: "+972501234570",
        isAdmin: false,
        isBarber: true,
        barberId: barberIds[0],
        hasPassword: true,
        role: "barber",
        permissions: newBarbersData[0].permissions,
        createdAt: Timestamp.now()
      },
      {
        uid: `barber-${barberIds[1]}`,
        email: "lidor.peleka@barbersbar.com",
        displayName: "לידור פלקה",
        phone: "+972501234571",
        isAdmin: false,
        isBarber: true,
        barberId: barberIds[1],
        hasPassword: true,
        role: "barber",
        permissions: newBarbersData[1].permissions,
        createdAt: Timestamp.now()
      },
      {
        uid: `barber-${barberIds[2]}`,
        email: "ben.harosh@barbersbar.com",
        displayName: "בן הרוש",
        phone: "+972501234572",
        isAdmin: false,
        isBarber: true,
        barberId: barberIds[2],
        hasPassword: true,
        role: "barber",
        permissions: newBarbersData[2].permissions,
        createdAt: Timestamp.now()
      },
      {
        uid: `barber-${barberIds[3]}`,
        email: "ariel.golan@barbersbar.com",
        displayName: "אריאל גולן",
        phone: "+972501234573",
        isAdmin: false,
        isBarber: true,
        barberId: barberIds[3],
        hasPassword: true,
        role: "barber",
        permissions: newBarbersData[3].permissions,
        createdAt: Timestamp.now()
      }
    ];

    for (const user of barberUsers) {
      await setDoc(doc(db, 'users', user.uid), user);
      console.log(`✅ Added user account: ${user.displayName} (${user.email})`);
    }

    // Setup availability for each new barber
    console.log('📅 Setting up availability for new barbers...');
    const defaultAvailability = [
      { dayOfWeek: 0, startTime: "09:00", endTime: "18:00", isAvailable: true }, // Sunday
      { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", isAvailable: true }, // Monday
      { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isAvailable: true }, // Tuesday
      { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", isAvailable: true }, // Wednesday
      { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", isAvailable: true }, // Thursday
      { dayOfWeek: 5, startTime: "09:00", endTime: "14:00", isAvailable: true }, // Friday - עד 2 בצהריים
      { dayOfWeek: 6, startTime: "09:00", endTime: "18:00", isAvailable: false } // Saturday - סגור
    ];

    for (let i = 0; i < barberIds.length; i++) {
      const barberId = barberIds[i];
      for (const availability of defaultAvailability) {
        await addDoc(collection(db, 'barberAvailability'), {
          barberId: barberId,
          ...availability,
          createdAt: Timestamp.now()
        });
      }
      console.log(`✅ Added availability for barber ${newBarbersData[i].name}`);
    }

    console.log('\n🎉 New barbers addition completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- 4 new barbers added to system');
    console.log('- 4 user accounts created with barber permissions');
    console.log('- Default availability set for each barber');
    console.log('\n📧 User accounts created:');
    console.log('- ofek.algarisi@barbersbar.com (אופק אלגריסי - 70₪/שעה)');
    console.log('- lidor.peleka@barbersbar.com (לידור פלקה - 60₪/שעה)');
    console.log('- ben.harosh@barbersbar.com (בן הרוש - 50₪/שעה)');
    console.log('- ariel.golan@barbersbar.com (אריאל גולן - 50₪/שעה)');
    console.log('\n🔑 All accounts need password setup via admin panel');

  } catch (error) {
    console.error('❌ Error adding new barbers:', error);
  }
};

// Run the addition script
console.log('🚀 Starting barbers addition process...');
addNewBarbers().then(() => {
  console.log('✅ Addition process completed');
}).catch((error) => {
  console.error('❌ Addition process failed:', error);
});