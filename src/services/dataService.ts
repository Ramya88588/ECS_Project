import { MedicineBox, Medicine, Alert } from '../types';
import { esp32Service} from './ESP32Service';  // <-- make sure this import exists

// LocalStorage keys
const STORAGE_KEYS = {
  MEDICINE_BOXES: 'smart_medicine_boxes',
  ALERTS: 'smart_medicine_alerts',
  INITIALIZED: 'smart_medicine_initialized'
};

// Default mock data for first-time users
const getDefaultMedicineBoxes = (): MedicineBox[] => [
  {
    id: '1',
    name: 'Kitchen Medicine Box',
    boxId: 'ESP32_001_AA:BB:CC:DD:EE:FF',
    ipAddress: '192.168.1.101',
    userId: '1',
    isConnected: true,
    lastSyncAt: new Date(),
    medicines: [
      {
        id: '1',
        name: 'Vitamin D',
        timesPerDay: 1,
        totalCount: 30,
        currentCount: 5,
        customMessage: 'Take with breakfast',
        scheduleTime: '08:00',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: '2',
        name: 'Blood Pressure Pills',
        timesPerDay: 2,
        totalCount: 60,
        currentCount: 15,
        customMessage: 'Take with water',
        scheduleTime: '08:00,20:00',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Bedroom Medicine Box',
    boxId: 'ESP32_002_FF:EE:DD:CC:BB:AA',
    ipAddress: '192.168.1.102',
    userId: '1',
    isConnected: true,
    lastSyncAt: new Date(),
    medicines: [
      {
        id: '3',
        name: 'Melatonin',
        timesPerDay: 1,
        totalCount: 30,
        currentCount: 20,
        customMessage: 'Take 30 minutes before bed',
        scheduleTime: '22:00',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02')
      }
    ],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: '3',
    name: 'Travel Medicine Box',
    boxId: 'ESP32_003_11:22:33:44:55:66',
    ipAddress: '192.168.1.103',
    userId: '1',
    isConnected: false,
    medicines: [
      {
        id: '4',
        name: 'Pain Relief',
        timesPerDay: 3,
        totalCount: 24,
        currentCount: 8,
        customMessage: 'Take with food',
        scheduleTime: '08:00,14:00,20:00',
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03')
      }
    ],
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  }
];

const getDefaultAlerts = (): Alert[] => [
  {
    id: '1',
    medicineId: '1',
    medicineName: 'Vitamin D',
    boxName: 'Kitchen Medicine Box',
    type: 'low_count',
    message: 'Vitamin D is running low (5 pills remaining). Time to refill!',
    isRead: false,
    createdAt: new Date()
  }
];

// Helper functions for localStorage operations
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    console.error(`Error reading from localStorage key ${key}:`, error);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving to localStorage key ${key}:`, error);
  }
}

// Initialize storage with default data if not exists
const initializeStorage = () => {
  const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!isInitialized) {
    saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, getDefaultMedicineBoxes());
    saveToStorage(STORAGE_KEYS.ALERTS, getDefaultAlerts());
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }
};

// Initialize storage on module load
// initializeStorage();

// Get current data from localStorage
const getMedicineBoxesFromStorage = (): MedicineBox[] => {
  return getFromStorage<MedicineBox[]>(STORAGE_KEYS.MEDICINE_BOXES, []).map(box => ({
    ...box,
    createdAt: new Date(box.createdAt),
    updatedAt: new Date(box.updatedAt),
    lastSyncAt: box.lastSyncAt ? new Date(box.lastSyncAt) : undefined,
    medicines: box.medicines.map(medicine => ({
      ...medicine,
      createdAt: new Date(medicine.createdAt),
      updatedAt: new Date(medicine.updatedAt)
    }))
  }));
};

const getAlertsFromStorage = (): Alert[] => {
  return getFromStorage<Alert[]>(STORAGE_KEYS.ALERTS, []).map(alert => ({
    ...alert,
    createdAt: new Date(alert.createdAt)
  }));
};

export const dataService = {
  // Medicine Boxes
  async getMedicineBoxes(userId: string): Promise<MedicineBox[]> {
    const boxes = getMedicineBoxesFromStorage();
    return boxes.filter(box => box.userId === userId);
  },

  async createMedicineBox(boxData: Omit<MedicineBox, 'id' | 'createdAt' | 'updatedAt'>): Promise<MedicineBox> {
    const boxes = getMedicineBoxesFromStorage();
    const newBox: MedicineBox = {
      ...boxData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    boxes.push(newBox);
    saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);
    return newBox;
  },

  async updateMedicineBox(id: string, updates: Partial<MedicineBox>): Promise<MedicineBox> {
    const boxes = getMedicineBoxesFromStorage();
    const index = boxes.findIndex(box => box.id === id);
    if (index === -1) throw new Error('Medicine box not found');
    
    boxes[index] = {
      ...boxes[index],
      ...updates,
      updatedAt: new Date()
    };
    saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);
    return boxes[index];
  },

  // async deleteMedicineBox(id: string): Promise<void> {
  //   const boxes = getMedicineBoxesFromStorage();
  //   const filteredBoxes = boxes.filter(box => box.id !== id);
  //   saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, filteredBoxes);
  // },
  async deleteMedicineBox(id: string): Promise<void> {
  const boxes = getMedicineBoxesFromStorage();
  const boxToDelete = boxes.find(box => box.id === id);

  if (!boxToDelete) {
    console.warn(`No medicine box found with id: ${id}`);
    return;
  }

  // 1️⃣ Delete the box itself
  const filteredBoxes = boxes.filter(box => box.id !== id);
  saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, filteredBoxes);

  // 2️⃣ Delete related alerts
  const alerts = getAlertsFromStorage();

  // Remove all alerts linked to this box or any medicine inside it
  const filteredAlerts = alerts.filter(alert => {
    const belongsToDeletedBox =
      alert.boxName === boxToDelete.name ||
      boxToDelete.medicines.some(med => med.id === alert.medicineId);
    return !belongsToDeletedBox; // keep only alerts NOT related to deleted box
  });

  saveToStorage(STORAGE_KEYS.ALERTS, filteredAlerts);
  window.location.reload();
},


  // Medicines
  async addMedicine(boxId: string, medicineData: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medicine> {
    const boxes = getMedicineBoxesFromStorage();
    const newMedicine: Medicine = {
      ...medicineData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const boxIndex = boxes.findIndex(box => box.id === boxId);
    if (boxIndex === -1) throw new Error('Medicine box not found');
    
    boxes[boxIndex].medicines.push(newMedicine);
    boxes[boxIndex].updatedAt = new Date();

    //mycode
    const alerts = getAlertsFromStorage();
    if (newMedicine.currentCount <= 3 && newMedicine.currentCount > 0) {
    const existingLowAlert = alerts.find(
      alert =>
        alert.medicineId === newMedicine.id &&
        alert.type === 'low_count' &&
        !alert.isRead
    );

    if (!existingLowAlert) {
      const lowCountAlert: Alert = {
        id: Math.random().toString(36).substr(2, 9),
        medicineId: newMedicine.id,
        medicineName: newMedicine.name,
        boxName: boxes[boxIndex].name,
        type: 'low_count',
        message: `${newMedicine.name} is running low (${newMedicine.currentCount} pills remaining). Time to refill!`,
        isRead: false,
        createdAt: new Date()
      };
      alerts.push(lowCountAlert);
    }
  }

  // Save updated boxes and alerts
  saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);
  saveToStorage(STORAGE_KEYS.ALERTS, alerts);

  return newMedicine;
  },

  async updateMedicine(boxId: string, medicineId: string, updates: Partial<Medicine>): Promise<Medicine> {
    const boxes = getMedicineBoxesFromStorage();
    const boxIndex = boxes.findIndex(box => box.id === boxId);
    if (boxIndex === -1) throw new Error('Medicine box not found');
    
    const medicineIndex = boxes[boxIndex].medicines.findIndex(med => med.id === medicineId);
    if (medicineIndex === -1) throw new Error('Medicine not found');
    
    boxes[boxIndex].medicines[medicineIndex] = {
      ...boxes[boxIndex].medicines[medicineIndex],
      ...updates,
      updatedAt: new Date()
    };
    boxes[boxIndex].updatedAt = new Date();
    saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);
    
    return boxes[boxIndex].medicines[medicineIndex];
  },

  async deleteMedicine(boxId: string, medicineId: string): Promise<void> {
    const boxes = getMedicineBoxesFromStorage();
    const boxIndex = boxes.findIndex(box => box.id === boxId);
    if (boxIndex === -1) throw new Error('Medicine box not found');
    
    boxes[boxIndex].medicines = boxes[boxIndex].medicines.filter(med => med.id !== medicineId);
    boxes[boxIndex].updatedAt = new Date();
    saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);

    // Delete all alerts related to this medicine
    const alerts = getAlertsFromStorage();
    const filteredAlerts = alerts.filter(alert => alert.medicineId !== medicineId);
    saveToStorage(STORAGE_KEYS.ALERTS, filteredAlerts);
  },

  // Alerts
  async getAlerts(userId: string): Promise<Alert[]> {
    const alerts = getAlertsFromStorage();
    
    // Clean up alerts older than 24 hours
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentAlerts = alerts.filter(alert => new Date(alert.createdAt) > oneDayAgo);
    
    // Only save if we filtered out some alerts
    if (recentAlerts.length !== alerts.length) {
      saveToStorage(STORAGE_KEYS.ALERTS, recentAlerts);
    }
    
    return recentAlerts;
  },

  async markAlertAsRead(alertId: string): Promise<void> {
    const alerts = getAlertsFromStorage();
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.isRead = true;
      saveToStorage(STORAGE_KEYS.ALERTS, alerts.filter(a => !a.isRead));
    }
  },

  // ESP32 Sync
  // async syncWithESP32(boxId: string): Promise<any> {
  //   // Find the medicine box by boxId (ESP32 device ID)
  //   const boxes = getMedicineBoxesFromStorage();
  //   const box = boxes.find(b => b.boxId === boxId);
  //   if (!box) {
  //     throw new Error('Medicine box not found');
  //   }

  //   // Format medicine schedule data for ESP32
  //   const scheduleData = {
  //     boxId: box.boxId,
  //     boxName: box.name,
  //     timestamp: new Date().toISOString(),
  //     medicines: box.medicines.map(medicine => ({
  //       id: medicine.id,
  //       name: medicine.name,
  //       timesPerDay: medicine.timesPerDay,
  //       scheduleTime: medicine.scheduleTime.split(',').map(time => time.trim()),
  //       currentCount: medicine.currentCount,
  //       customMessage: medicine.customMessage || `Time to take your ${medicine.name}`,
  //       isActive: medicine.currentCount > 0
  //     })),
  //     totalMedicines: box.medicines.length,
  //     activeMedicines: box.medicines.filter(m => m.currentCount > 0).length
  //   };

  //   // In a real implementation, this would make an HTTP request to the ESP32 device
  //   // Example: fetch(`http://${esp32IP}/sync`, { method: 'POST', body: JSON.stringify(scheduleData) })
    
  //   console.log('Syncing with ESP32:', JSON.stringify(scheduleData, null, 2));
    
  //   // Mock the HTTP request with realistic timing and improved error handling
  //   return new Promise((resolve, reject) => {
  //     setTimeout(() => {
  //       // Simulate connection check - try to connect if offline
  //       if (!box.isConnected) {
  //         // Simulate a 70% chance of successful connection
  //         const connectionSuccess = Math.random() > 0.3;
  //         if (connectionSuccess) {
  //           box.isConnected = true;
  //           box.lastSyncAt = new Date();
  //         }
  //       }
        
  //       // Check final connection status
  //       if (box.isConnected) {
  //         // Update last sync time
  //         box.lastSyncAt = new Date();
  //         saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);
          
  //         resolve({
  //           boxId,
  //           status: 'success',
  //           message: `Successfully synced ${box.medicines.length} medicine schedules to ESP32`,
  //           syncedAt: new Date().toISOString(),
  //           syncData: scheduleData
  //         });
  //       } else {
  //         reject(new Error('ESP32 device is not connected. Please check the device connection and try again.'));
  //       }
  //     }, 2000);
  //   });
  // },


//Changed data by me----------------------------------------------------

async syncWithESP32(boxId: string): Promise<any> {
  const boxes = getMedicineBoxesFromStorage();
  const box = boxes.find(b => b.boxId === boxId);
  if (!box) throw new Error('Medicine box not found');

  try {
    // ✅ Real call to your ESP32
    const result = await esp32Service.syncMedicines(box);

    // ✅ If success, update local info
    if (result.success) {
      box.isConnected = true;
      box.lastSyncAt = new Date();
      saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);
    } else {
      box.isConnected = false;
    }

    return {
      boxId,
      status: result.success ? 'success' : 'failed',
      message: result.message,
      syncedAt: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('Sync error:', error);
    box.isConnected = false;
    saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);
    throw new Error('Failed to sync with ESP32: ' + error.message);
  }
},


//changed by me-------------------------------------------------------


  // Toggle ESP32 connection status (for testing)
  async toggleESP32Connection(boxId: string): Promise<MedicineBox> {
    const boxes = getMedicineBoxesFromStorage();
    const box = boxes.find(b => b.boxId === boxId);
    if (!box) {
      throw new Error('Medicine box not found');
    }
    
    box.isConnected = !box.isConnected;
    box.updatedAt = new Date();
    
    if (box.isConnected) {
      box.lastSyncAt = new Date();
    }
    
    saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);
    return box;
  },

  // Simulate ESP32 connection attempt


  //code changed by me --------------------------------------------


  // async attemptESP32Connection(boxId: string): Promise<{ success: boolean; message: string }> {
  //   const boxes = getMedicineBoxesFromStorage();
  //   const box = boxes.find(b => b.boxId === boxId);
  //   if (!box) {
  //     throw new Error('Medicine box not found');
  //   }

  //   // Simulate connection attempt with random success/failure
  //   return new Promise((resolve) => {
  //     setTimeout(() => {
  //       const success = Math.random() > 0.2; // 80% success rate
        
  //       if (success) {
  //         box.isConnected = true;
  //         box.lastSyncAt = new Date();
  //         box.updatedAt = new Date();
          
  //         saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);
  //         resolve({
  //           success: true,
  //           message: `Successfully connected to ESP32 device ${box.boxId.split('_')[1]}`
  //         });
  //       } else {
  //         box.isConnected = false;
  //         box.updatedAt = new Date();
          
  //         saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);
  //         resolve({
  //           success: false,
  //           message: 'Failed to connect to ESP32 device. Please check if the device is powered on and within range.'
  //         });
  //       }
  //     }, 1500);
  //   });
  // },


  //duplicate code -----------------------------------------------


//   async attemptESP32Connection(boxId: string): Promise<{ success: boolean; message: string }> {
//   const boxes = getMedicineBoxesFromStorage();
//   const box = boxes.find(b => b.boxId === boxId);
//   if (!box) throw new Error('Medicine box not found');

//   try {
//     // Try to ping the ESP32
//     const response = await fetch(`http://${box.ipAddress}/ping`, { method: 'GET', signal: AbortSignal.timeout(5000) });

//     if (response.ok) {
//       box.isConnected = true;
//       box.lastSyncAt = new Date();
//       box.updatedAt = new Date();
//       saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);
//       return {
//         success: true,
//         message: `✅ Connected to ESP32 device (${box.ipAddress})`
//       };
//     } else {
//       throw new Error(`HTTP ${response.status}`);
//     }
//   } catch (error) {
//     box.isConnected = false;
//     box.updatedAt = new Date();
//     saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);
//     return {
//       success: false,
//       message: '❌ Could not reach ESP32. Please check if the device is powered on and on the same network.'
//     };
//   }
// },
 // adjust path if needed

async attemptESP32Connection(boxId: string): Promise<{ success: boolean; message: string }> {
  const boxes = getMedicineBoxesFromStorage();
  const box = boxes.find(b => b.boxId === boxId);
  if (!box) throw new Error('Medicine box not found');

  const result = await esp32Service.testConnection(box.ipAddress);

  // Update local storage based on result
  box.isConnected = result.success;
  box.updatedAt = new Date();
  if (result.success) box.lastSyncAt = new Date();

  saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);

  return result;
},

//code changed by me-----------------------------------------------

  // Track medicine times and auto-deduct counts
  checkMedicineTimes(): Alert[] {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentDate = now.toDateString();
    const newAlerts: Alert[] = [];
    
    const boxes = getMedicineBoxesFromStorage();
    const alerts = getAlertsFromStorage();

    boxes.forEach(box => {
      box.medicines.forEach(medicine => {
        const scheduleTimes = medicine.scheduleTime.split(',').map(time => time.trim());
        
        scheduleTimes.forEach(scheduleTime => {
          const medicineTimeKey = `${medicine.id}_${scheduleTime}_${currentDate}`;
          
          // Check if it's time to take medicine and we haven't already processed this time today
          if (scheduleTime === currentTime && medicine.currentCount > 0) {
            // Check if we've already processed this medicine time today
            // const existingTimeAlert = alerts.find(
            //   alert => alert.medicineId === medicine.id && 
            //           alert.type === 'medicine_time' && 
            //           alert.createdAt.toDateString() === currentDate &&
            //           alert.message.includes(scheduleTime)
            // );
            //code changed by me---------------------------
            const existingTimeAlert = alerts.find(alert => {
           const alertDate = new Date(alert.createdAt).toDateString();
              return (
                alert.medicineId === medicine.id &&
                alert.type === 'medicine_time' &&
                alertDate === currentDate &&
                alert.message.includes(scheduleTime)
               );
              });
              // code changed by me ------------------
            if (!existingTimeAlert) {
              // Deduct medicine count
              medicine.currentCount = Math.max(0, medicine.currentCount - 1);
              medicine.updatedAt = now;

              // Create medicine time alert
              const timeAlert: Alert = {
                id: Math.random().toString(36).substr(2, 9),
                medicineId: medicine.id,
                medicineName: medicine.name,
                boxName: box.name,
                type: 'medicine_time',
                message: `Time to take your ${medicine.name} (${scheduleTime}). ${medicine.customMessage || 'Take as prescribed.'}`,
                isRead: false,
                createdAt: now
              };
              newAlerts.push(timeAlert);
              alerts.push(timeAlert);

              // Check if count is now low after deduction
              if (medicine.currentCount <= 3 && medicine.currentCount > 0) {
                const existingLowAlert = alerts.find(
                  alert => alert.medicineId === medicine.id && alert.type === 'low_count' && !alert.isRead
                );

                if (!existingLowAlert) {
                  const lowCountAlert: Alert = {
                    id: Math.random().toString(36).substr(2, 9),
                    medicineId: medicine.id,
                    medicineName: medicine.name,
                    boxName: box.name,
                    type: 'low_count',
                    message: `${medicine.name} is running low (${medicine.currentCount} pills remaining). Time to refill!`,
                    isRead: false,
                    createdAt: now
                  };
                  newAlerts.push(lowCountAlert);
                  alerts.push(lowCountAlert);
                }
              }

              // If count reaches 0, create out of stock alert
              if (medicine.currentCount === 0) {
                const outOfStockAlert: Alert = {
                  id: Math.random().toString(36).substr(2, 9),
                  medicineId: medicine.id,
                  medicineName: medicine.name,
                  boxName: box.name,
                  type: 'out_of_stock',
                  message: `${medicine.name} is out of stock! Please refill immediately.`,
                  isRead: false,
                  createdAt: now
                };
                newAlerts.push(outOfStockAlert);
                alerts.push(outOfStockAlert);
              }
            }
          }
        });
      });
    });

    // Save updated data
    saveToStorage(STORAGE_KEYS.MEDICINE_BOXES, boxes);
    saveToStorage(STORAGE_KEYS.ALERTS, alerts);

    return newAlerts;
  },
//code changed by me------------------------------------------
  // Auto-check for low medicines (manual check)
  // checkLowMedicines(): Alert[] {
  //   const newAlerts: Alert[] = [];
  //   const boxes = getMedicineBoxesFromStorage();
  //   const alerts = getAlertsFromStorage();
    
  //   boxes.forEach(box => {
  //     box.medicines.forEach(medicine => {
  //       const daysRemaining = medicine.currentCount / medicine.timesPerDay;
  //       if (daysRemaining <= 3 && daysRemaining > 0) {
  //         // Check if alert already exists
  //         const existingAlert = alerts.find(
  //           alert => alert.medicineId === medicine.id && alert.type === 'low_count' && !alert.isRead
  //         );
          
  //         if (!existingAlert) {
  //           const newAlert: Alert = {
  //             id: Math.random().toString(36).substr(2, 9),
  //             medicineId: medicine.id,
  //             medicineName: medicine.name,
  //             boxName: box.name,
  //             type: 'low_count',
  //             message: `${medicine.name} is running low (${medicine.currentCount} pills remaining). Time to refill!`,
  //             isRead: false,
  //             createdAt: new Date()
  //           };
  //           newAlerts.push(newAlert);
  //           alerts.push(newAlert);
  //         }
  //       }
  //     });
  //   });
    
  //   // Save updated alerts
  //   saveToStorage(STORAGE_KEYS.ALERTS, alerts);
    
  //   return newAlerts;
  // },

  checkLowMedicines(): Alert[] {
  const newAlerts: Alert[] = [];
  const boxes = getMedicineBoxesFromStorage();
  const alerts = getAlertsFromStorage();

  boxes.forEach(box => {
    box.medicines.forEach(medicine => {
      const daysRemaining = medicine.currentCount / medicine.timesPerDay;

      if (daysRemaining <= 3 && daysRemaining > 0) {
        // Check if a low_count alert already exists for this medicine and is unread
        const existingAlert = alerts.find(
          alert => alert.medicineId === medicine.id && alert.type === 'low_count'
          //  && !alert.isRead
        );

        if (!existingAlert) {
          // Only create a new alert if it doesn't already exist
          const newAlert: Alert = {
            id: Math.random().toString(36).substr(2, 9),
            medicineId: medicine.id,
            medicineName: medicine.name,
            boxName: box.name,
            type: 'low_count',
            message: `${medicine.name} is running low (${medicine.currentCount} pills remaining). Time to refill!`,
            isRead: false,
            createdAt: new Date()
          };
          newAlerts.push(newAlert);
          alerts.push(newAlert);
        }
      }
    });
  });

  // Save updated alerts
  saveToStorage(STORAGE_KEYS.ALERTS, alerts);

  return newAlerts;
},

//code changed by me --------------------------------------
  // Mark all alerts as read
  async markAllAlertsAsRead(userId: string): Promise<void> {
    const alerts = getAlertsFromStorage();
    alerts.forEach(alert => {
      alert.isRead = true;
    });
    saveToStorage(STORAGE_KEYS.ALERTS, alerts);
  },

  // code added by me-------

  async deleteAlert(alertId: string): Promise<void> {
  const alerts = getAlertsFromStorage();
  const updatedAlerts = alerts.filter(alert => alert.id !== alertId);
  saveToStorage(STORAGE_KEYS.ALERTS, updatedAlerts);
}
};