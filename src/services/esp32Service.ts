import { SyncData, ESP32Response, MedicineBox } from '../types';

export class ESP32Service {
  // Test connectivity to ESP32 device
  static async testConnection(ipAddress: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`http://${ipAddress}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `Connected to ESP32 (${data.boxId || 'Unknown ID'})`
        };
      } else {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        message: 'Connection failed: Device unreachable'
      };
    }
  }

  // Sync medicine data to ESP32
  static async syncMedicines(box: MedicineBox): Promise<{ success: boolean; message: string }> {
    try {
      const syncData: SyncData = {
        boxId: box.boxId,
        medicines: box.medicines.map(medicine => ({
          id: medicine.id,
          name: medicine.name,
          times: medicine.scheduleTime.split(','),
          message: medicine.customMessage || `Time to take ${medicine.name}`
        }))
      };

      const response = await fetch(`http://${box.ipAddress}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(syncData),
        
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const result: ESP32Response = await response.json();
        return {
          success: result.status === 'success',
          message: result.message || 'Sync completed successfully'
        };
      } else {
        return {
          success: false,
          message: `Sync failed: HTTP ${response.status}`
        };
      }
    } catch (error) {
      console.error('Sync failed:', error);
      return {
        success: false,
        message: 'Sync failed: Unable to reach device'
      };
    }
  }

  // Get current status from ESP32
  static async getStatus(ipAddress: string): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      const response = await fetch(`http://${ipAddress}/status`, {
        method: 'GET',
      
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data,
          message: 'Status retrieved successfully'
        };
      } else {
        return {
          success: false,
          message: `Failed to get status: HTTP ${response.status}`
        };
      }
    } catch (error) {
      console.error('Status check failed:', error);
      return {
        success: false,
        message: 'Status check failed: Device unreachable'
      };
    }
  }

  // Disconnect from ESP32 (optional - sends disconnect signal)
  static async disconnect(ipAddress: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`http://${ipAddress}/disconnect`, {
        method: 'POST',
       
        signal: AbortSignal.timeout(5000)
      });
      
      return {
        success: response.ok,
        message: response.ok ? 'Disconnected successfully' : 'Disconnect signal failed'
      };
    } catch (error) {
      // Even if the request fails, we consider it "disconnected"
      return {
        success: true,
        message: 'Disconnected (device unreachable)'
      };
    }
  }
}

export const esp32Service = ESP32Service;