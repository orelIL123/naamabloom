import { startOfDay } from 'date-fns';
import {
    collection,
    DocumentData,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    QuerySnapshot,
    Timestamp,
    where,
} from 'firebase/firestore';
import { db } from '../../app/config/firebase';
import { parseTimeToDate } from './date';

// Mapping constants - adjust these to match your Firestore structure
const COLLECTIONS = {
  APPOINTMENTS: 'appointments',
  BARBERS: 'barbers',
  TREATMENTS: 'treatments',
};

const APPOINTMENT_FIELDS = {
  BARBER_ID: 'barberId',
  BARBER_NAME: 'barberName', 
  CLIENT_NAME: 'clientName',
  SERVICE_NAME: 'serviceName',
  START_AT: 'date', // Using existing 'date' field
  END_AT: 'endDate', // Will calculate if not exists
  STATUS: 'status',
  NOTES: 'notes',
  COLOR: 'color',
  TREATMENT_ID: 'treatmentId',
  USER_ID: 'userId',
  CLIENT_PHONE: 'clientPhone',
};

const BARBER_FIELDS = {
  ID: 'id',
  NAME: 'name',
  COLOR: 'color',
};

export type CalendarAppointment = {
  id: string;
  barberId: string;
  barberName: string;
  clientName: string;
  serviceName: string;
  startAt: Date;
  endAt: Date;
  status: 'booked' | 'confirmed' | 'canceled' | 'completed' | 'pending';
  notes?: string;
  color?: string;
  duration?: number;
  clientPhone?: string;
};

export type CalendarBarber = {
  id: string;
  name: string;
  color?: string;
};

const convertFirestoreAppointment = (doc: any, treatments: any[] = [], barbers: any[] = []): CalendarAppointment => {
  const data = doc.data();

  // Start date handling: support Firestore Timestamp or string 'YYYY-MM-DD' (+ optional 'time')
  let startDate: Date;
  const rawStart = data[APPOINTMENT_FIELDS.START_AT];
  if (rawStart?.toDate) {
    const base = startOfDay(rawStart.toDate());
    if (typeof data.time === 'string' && data.time.includes(':')) {
      startDate = parseTimeToDate(data.time, base);
    } else {
      startDate = rawStart.toDate();
    }
  } else if (typeof rawStart === 'string') {
    const base = new Date(`${rawStart}T00:00:00`);
    if (typeof data.time === 'string' && data.time.includes(':')) {
      startDate = parseTimeToDate(data.time, base);
    } else {
      startDate = base;
    }
  } else {
    startDate = new Date();
  }
  
  // Calculate end date - use duration from treatment or default 60 minutes
  let endDate = data[APPOINTMENT_FIELDS.END_AT]?.toDate?.() || undefined;
  if (!endDate) {
    const treatment = treatments.find(t => t.id === data[APPOINTMENT_FIELDS.TREATMENT_ID]);
    const duration = data.duration || treatment?.duration || 60; // minutes
    endDate = new Date(startDate.getTime() + duration * 60000);
  }

  // Map status to our calendar status
  let status: CalendarAppointment['status'] = 'booked';
  if (data[APPOINTMENT_FIELDS.STATUS] === 'confirmed') status = 'confirmed';
  else if (data[APPOINTMENT_FIELDS.STATUS] === 'cancelled') status = 'canceled';
  else if (data[APPOINTMENT_FIELDS.STATUS] === 'completed') status = 'completed';
  else if (data[APPOINTMENT_FIELDS.STATUS] === 'pending') status = 'pending';

  // Get treatment name for service name
  const treatment = treatments.find(t => t.id === data[APPOINTMENT_FIELDS.TREATMENT_ID]);
  const serviceName = treatment?.name || data[APPOINTMENT_FIELDS.SERVICE_NAME] || 'טיפול';

  // Get barber name - try to find it from barbers list or use stored name
  let barberName = data[APPOINTMENT_FIELDS.BARBER_NAME] || 'לא צוין';
  if (barberName === 'לא צוין' && data[APPOINTMENT_FIELDS.BARBER_ID]) {
    // Try to find barber name from the barbers list passed to the function
    const barber = barbers.find(b => b.id === data[APPOINTMENT_FIELDS.BARBER_ID]);
    if (barber && barber.name) {
      barberName = barber.name;
    }
  }

  return {
    id: doc.id,
    barberId: data[APPOINTMENT_FIELDS.BARBER_ID] || '',
    barberName: barberName,
    clientName: data[APPOINTMENT_FIELDS.CLIENT_NAME] || (data.isManualClient ? data.clientName : 'לא צוין'),
    serviceName: serviceName,
    startAt: startDate,
    endAt: endDate,
    status,
    notes: data[APPOINTMENT_FIELDS.NOTES] || '',
    color: data[APPOINTMENT_FIELDS.COLOR] || undefined,
    duration: data.duration || treatment?.duration || 30,
    clientPhone: data[APPOINTMENT_FIELDS.CLIENT_PHONE] || (data.isManualClient ? data.clientPhone : undefined),
  };
};

export const listenAppointmentsRange = (
  params: {
    start: Date;
    end: Date;
    barberId?: string;
  },
  callback: (appointments: CalendarAppointment[]) => void,
  treatments: any[] = [],
  barbers: any[] = []
): (() => void) => {
  const { start, end, barberId } = params;
  
  // Handle 'main' barber selection - get the first barber (רן אלגריסי)
  let actualBarberId = barberId;
  if (barberId === 'main' && barbers.length > 0) {
    // Sort barbers to ensure רן אלגריסי is first
    const sortedBarbers = barbers.sort((a, b) => {
      if (a.name === 'רן אלגריסי') return -1;
      if (b.name === 'רן אלגריסי') return 1;
      return a.name.localeCompare(b.name);
    });
    actualBarberId = sortedBarbers[0].id;
  }
  
  // Create a simpler query without complex composite indexes
  let q = query(
    collection(db, COLLECTIONS.APPOINTMENTS),
    where(APPOINTMENT_FIELDS.START_AT, '>=', Timestamp.fromDate(start)),
    where(APPOINTMENT_FIELDS.START_AT, '<=', Timestamp.fromDate(end))
  );

  // Don't add orderBy to avoid index issues - we'll sort in memory
  if (actualBarberId && actualBarberId !== 'all') {
    q = query(q, where(APPOINTMENT_FIELDS.BARBER_ID, '==', actualBarberId));
  }

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const appointments = snapshot.docs
        .map(doc => convertFirestoreAppointment(doc, treatments, barbers))
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime()); // Sort in memory
      callback(appointments);
    },
    (error) => {
      console.error('Error listening to appointments:', error);
      
      // Fallback: Try without date range filters to avoid index issues
      const fallbackQuery = query(
        collection(db, COLLECTIONS.APPOINTMENTS),
        ...(actualBarberId && actualBarberId !== 'all' ? [where(APPOINTMENT_FIELDS.BARBER_ID, '==', actualBarberId)] : [])
      );
      
      return onSnapshot(
        fallbackQuery,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const appointments = snapshot.docs
            .map(doc => convertFirestoreAppointment(doc, treatments, barbers))
            .filter(apt => {
              const aptTime = apt.startAt.getTime();
              return aptTime >= start.getTime() && aptTime <= end.getTime();
            })
            .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
          callback(appointments);
        },
        (fallbackError) => {
          console.error('Fallback query also failed:', fallbackError);
          callback([]);
        }
      );
    }
  );
};

export const getBarbers = async (): Promise<CalendarBarber[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.BARBERS),
      orderBy(BARBER_FIELDS.NAME, 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data()[BARBER_FIELDS.NAME] || 'ספר',
      color: doc.data()[BARBER_FIELDS.COLOR] || undefined,
    }));
  } catch (error) {
    console.error('Error fetching barbers:', error);
    return [];
  }
};

export const getTreatments = async (): Promise<any[]> => {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.TREATMENTS));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching treatments:', error);
    return [];
  }
};