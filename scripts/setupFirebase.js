const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, doc, setDoc, getDocs, Timestamp } = require('firebase/firestore');

console.log('🔧 Starting Firebase setup script...');

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

const setupFirebaseCollections = async () => {
  try {
    console.log('🚀 Setting up Firebase collections for Barbers Bar...');
    
    // 1. Setup Barbers Collection
    console.log('📋 Setting up barbers collection...');
    const barbersData = [
      {
        name: "רן אגלריסי",
        image: "",
        specialties: ["תספורת מקצועית", "עיצוב זקן", "טיפוח גברי", "תספורת מודרנית"],
        experience: "15 שנות ניסיון",
        rating: 5.0,
        available: true,
        phone: "+972501234567",
        photoUrl: "",
        bio: "ספר מקצועי עם ניסיון של 15 שנה בתחום התספורות והטיפוח הגברי",
        pricing: {}
      }
    ];

    for (const barber of barbersData) {
      await addDoc(collection(db, 'barbers'), {
        ...barber,
        createdAt: Timestamp.now()
      });
      console.log(`✅ Added barber: ${barber.name}`);
    }

    // 2. Setup Treatments Collection
    console.log('💇 Setting up treatments collection...');
    const treatmentsData = [
      {
        name: "תספורת קלאסית",
        duration: 45,
        price: 80,
        description: "תספורת גברים קלאסית עם גימור מושלם",
        image: ""
      },
      {
        name: "עיצוב זקן",
        duration: 30,
        price: 60,
        description: "עיצוב וגימור זקן מקצועי",
        image: ""
      },
      {
        name: "תספורת + זקן",
        duration: 60,
        price: 120,
        description: "פקאג' שלם - תספורת ועיצוב זקן",
        image: ""
      },
      {
        name: "טיפוח פנים",
        duration: 50,
        price: 100,
        description: "טיפוח פנים מקצועי לגברים",
        image: ""
      },
      {
        name: "תספורת ילדים",
        duration: 30,
        price: 50,
        description: "תספורת מיוחדת לילדים",
        image: ""
      },
      {
        name: "גילוח זקן",
        duration: 20,
        price: 40,
        description: "גילוח זקן מקצועי",
        image: ""
      }
    ];

    for (const treatment of treatmentsData) {
      await addDoc(collection(db, 'treatments'), treatment);
      console.log(`✅ Added treatment: ${treatment.name}`);
    }

    // 3. Setup Gallery Collection
    console.log('🖼️ Setting up gallery collection...');
    const galleryData = [
      {
        imageUrl: "",
        type: "gallery",
        order: 1,
        isActive: true,
        createdAt: Timestamp.now()
      },
      {
        imageUrl: "",
        type: "gallery",
        order: 2,
        isActive: true,
        createdAt: Timestamp.now()
      },
      {
        imageUrl: "",
        type: "gallery",
        order: 3,
        isActive: true,
        createdAt: Timestamp.now()
      },
      {
        imageUrl: "",
        type: "gallery",
        order: 4,
        isActive: true,
        createdAt: Timestamp.now()
      },
      {
        imageUrl: "",
        type: "atmosphere",
        order: 1,
        isActive: true,
        createdAt: Timestamp.now()
      },
      {
        imageUrl: "",
        type: "aboutus",
        order: 1,
        isActive: true,
        createdAt: Timestamp.now()
      }
    ];

    for (const image of galleryData) {
      await addDoc(collection(db, 'gallery'), image);
      console.log(`✅ Added gallery image: ${image.type} #${image.order}`);
    }

    // 4. Setup App Settings
    console.log('⚙️ Setting up app settings...');
    const settingsData = [
      {
        key: "shopName",
        value: "Barbers Bar",
        updatedAt: Timestamp.now()
      },
      {
        key: "shopDescription",
        value: "ספר מקצועי עם שירותים איכותיים",
        updatedAt: Timestamp.now()
      },
      {
        key: "contactPhone",
        value: "+972501234567",
        updatedAt: Timestamp.now()
      },
      {
        key: "contactEmail",
        value: "info@barbersbar.com",
        updatedAt: Timestamp.now()
      },
      {
        key: "businessHours",
        value: {
          sunday: { start: "09:00", end: "18:00", isOpen: true },
          monday: { start: "09:00", end: "18:00", isOpen: true },
          tuesday: { start: "09:00", end: "18:00", isOpen: true },
          wednesday: { start: "09:00", end: "18:00", isOpen: true },
          thursday: { start: "09:00", end: "18:00", isOpen: true },
          friday: { start: "09:00", end: "14:00", isOpen: true },
          saturday: { start: "09:00", end: "18:00", isOpen: false }
        },
        updatedAt: Timestamp.now()
      },
      {
        key: "maxBookingDaysAhead",
        value: 30,
        updatedAt: Timestamp.now()
      },
      {
        key: "showGallery",
        value: true,
        updatedAt: Timestamp.now()
      },
      {
        key: "homepageBanner",
        value: "",
        updatedAt: Timestamp.now()
      }
    ];

    for (const setting of settingsData) {
      await addDoc(collection(db, 'settings'), setting);
      console.log(`✅ Added setting: ${setting.key}`);
    }

    // 5. Setup Shop Items
    console.log('🛍️ Setting up shop items...');
    const shopItemsData = [
      {
        name: "שמן זקן פרימיום",
        description: "שמן טבעי לטיפוח הזקן עם ריח נעים",
        price: 45,
        imageUrl: "",
        category: "טיפוח",
        isActive: true,
        stock: 20,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        name: "מסרק זקן מקצועי",
        description: "מסרק איכותי לעיצוב הזקן",
        price: 25,
        imageUrl: "",
        category: "כלים",
        isActive: true,
        stock: 15,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        name: "ג'ל לשיער גברים",
        description: "ג'ל מקצועי לעיצוב השיער",
        price: 35,
        imageUrl: "",
        category: "טיפוח",
        isActive: true,
        stock: 30,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        name: "ספריי לשיער",
        description: "ספריי מקצועי לקיבוע השיער",
        price: 40,
        imageUrl: "",
        category: "טיפוח",
        isActive: true,
        stock: 25,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    ];

    for (const item of shopItemsData) {
      await addDoc(collection(db, 'shopItems'), item);
      console.log(`✅ Added shop item: ${item.name}`);
    }

    // 6. Setup Barber Availability
    console.log('📅 Setting up barber availability...');
    const barbersSnapshot = await getDocs(collection(db, 'barbers'));
    const barberDoc = barbersSnapshot.docs[0]; // Get the first barber (רן אגלריסי)
    
    if (barberDoc) {
      const availabilityData = [
        { dayOfWeek: 0, startTime: "09:00", endTime: "18:00", isAvailable: true }, // Sunday
        { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", isAvailable: true }, // Monday
        { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isAvailable: true }, // Tuesday
        { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", isAvailable: true }, // Wednesday
        { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", isAvailable: true }, // Thursday
        { dayOfWeek: 5, startTime: "09:00", endTime: "14:00", isAvailable: true }, // Friday - עד 2 בצהריים
        { dayOfWeek: 6, startTime: "09:00", endTime: "18:00", isAvailable: false } // Saturday - סגור
      ];

      for (const availability of availabilityData) {
        await addDoc(collection(db, 'barberAvailability'), {
          barberId: barberDoc.id,
          ...availability,
          createdAt: Timestamp.now()
        });
        console.log(`✅ Added availability for day ${availability.dayOfWeek}`);
      }
    }

    // 7. Setup Sample Users (for testing)
    console.log('👥 Setting up sample users...');
    const sampleUsersData = [
      {
        uid: "sample-user-1",
        email: "test@barbersbar.com",
        displayName: "משתמש לדוגמה",
        phone: "+972501234568",
        isAdmin: false,
        hasPassword: true,
        createdAt: Timestamp.now()
      },
      {
        uid: "admin-user-1",
        email: "admin@barbersbar.com",
        displayName: "רן אגלריסי",
        phone: "+972501234567",
        isAdmin: true,
        hasPassword: true,
        createdAt: Timestamp.now()
      },
      {
        uid: "orel-admin",
        email: "orel895@gmail.com",
        displayName: "Orel Admin",
        phone: "+972501234569",
        isAdmin: true,
        hasPassword: true,
        createdAt: Timestamp.now()
      }
    ];

    for (const user of sampleUsersData) {
      await setDoc(doc(db, 'users', user.uid), user);
      console.log(`✅ Added user: ${user.displayName} (${user.email})`);
    }

    // 8. Setup Sample Appointments (for testing)
    console.log('📅 Setting up sample appointments...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const sampleAppointmentsData = [
      {
        userId: "sample-user-1",
        barberId: barberDoc ? barberDoc.id : "default-barber",
        treatmentId: "sample-treatment-1",
        date: Timestamp.fromDate(tomorrow),
        status: "confirmed",
        notes: "תור לדוגמה",
        duration: 45,
        createdAt: Timestamp.now()
      }
    ];

    for (const appointment of sampleAppointmentsData) {
      await addDoc(collection(db, 'appointments'), appointment);
      console.log(`✅ Added appointment for ${appointment.date.toDate().toLocaleDateString()}`);
    }

    console.log('\n🎉 Firebase setup completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- 1 barber (רן אגלריסי)');
    console.log('- 6 treatments');
    console.log('- 6 gallery images');
    console.log('- 8 app settings');
    console.log('- 4 shop items');
    console.log('- 7 availability slots');
    console.log('- 3 sample users (including orel895@gmail.com as admin)');
    console.log('- 1 sample appointment');
    console.log('\n🔗 Firebase Project: barbers-bar-ae31f');
    console.log('🌐 Firebase Console: https://console.firebase.google.com/project/barbers-bar-ae31f');

  } catch (error) {
    console.error('❌ Error setting up Firebase:', error);
  }
};

// Run the setup
console.log('🚀 Starting setup process...');
setupFirebaseCollections().then(() => {
  console.log('✅ Setup process completed');
}).catch((error) => {
  console.error('❌ Setup process failed:', error);
}); 