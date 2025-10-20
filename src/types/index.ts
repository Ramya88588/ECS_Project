export interface Medicine {
  id: string;
  name: string;
  timesPerDay: number;
  totalCount: number;
  currentCount: number;
  customMessage?: string;
  scheduleTime: string; // Format: "08:00,14:00,20:00"
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicineBox {
  id: string;
  name: string;
  boxId: string; // ESP32 unique identifier (MAC/BLE ID)
  ipAddress: string; // ESP32 IP address for HTTP communication
  userId: string;
  medicines: Medicine[];
  isConnected: boolean;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncData {
  boxId: string;
  medicines: {
    id: string;
    name: string;
    times: string[];
    message: string;
  }[];
}

export interface ESP32Response {
  boxId: string;
  status: 'success' | 'error';
  message: string;
  currentSchedule?: SyncData;
}

export interface Alert {
  id: string;
  medicineId: string;
  medicineName: string;
  boxName: string;
  type: 'low_count' | 'refill_needed' | 'schedule_reminder' | 'medicine_time' | 'out_of_stock' | 'sync_success';
  message: string;
  isRead: boolean;
  createdAt: Date;
}