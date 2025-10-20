# Smart Medicine Box - Database Schema & API Documentation

## Database Schema (Supabase/Firestore)

### Users Table
```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### Medicine Boxes Table
```sql
medicine_boxes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  box_id TEXT UNIQUE NOT NULL, -- ESP32 unique identifier
  is_connected BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### Medicines Table
```sql
medicines (
  id UUID PRIMARY KEY,
  box_id UUID REFERENCES medicine_boxes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  times_per_day INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  current_count INTEGER NOT NULL,
  custom_message TEXT,
  schedule_time TEXT NOT NULL, -- Format: "08:00,14:00,20:00"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### Alerts Table
```sql
alerts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  box_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('low_count', 'refill_needed', 'schedule_reminder')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
)
```

## ESP32 API Endpoints

### GET /info
Returns current box information and schedule.

**Response:**
```json
{
  "boxId": "ESP32_001_AA:BB:CC:DD:EE:FF",
  "deviceName": "MedBox-ABC123",
  "status": "online",
  "medicineCount": 2,
  "wifiConnected": true,
  "ipAddress": "192.168.1.100",
  "medicines": [
    {
      "name": "Vitamin D",
      "timesPerDay": 1,
      "scheduleTime": "08:00",
      "message": "Take with breakfast"
    },
    {
      "name": "Blood Pressure Pills",
      "timesPerDay": 2,
      "scheduleTime": "08:00,20:00",
      "message": "Take with water"
    }
  ]
}
```

### POST /sync
Sends new medicine schedule to ESP32.

**Request Body:**
```json
{
  "boxId": "ESP32_001_AA:BB:CC:DD:EE:FF",
  "medicines": [
    {
      "id": "medicine-uuid-1",
      "name": "Vitamin D",
      "timesPerDay": 1,
      "scheduleTime": "08:00",
      "message": "Take with breakfast"
    },
    {
      "id": "medicine-uuid-2",
      "name": "Blood Pressure Pills",
      "timesPerDay": 2,
      "scheduleTime": "08:00,20:00",
      "message": "Take with water"
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Schedule updated"
}
```

## BLE (Bluetooth Low Energy) Protocol

### Service UUID
`12345678-1234-1234-1234-123456789abc`

### Characteristic UUID
`87654321-4321-4321-4321-cba987654321`

### Advertising Data
- Device Name: `MedBox-{UNIQUE_ID}`
- Service UUID: Medicine Box Service
- Characteristic Value: Full Box ID (`ESP32_001_AA:BB:CC:DD:EE:FF`)

## Data Flow

### 1. Device Discovery
1. ESP32 advertises via BLE with unique Box ID
2. React app scans for BLE devices using Web Bluetooth API
3. User selects and pairs with specific device
4. Box ID is stored in user's account

### 2. Medicine Sync
1. User adds/modifies medicines in React app
2. App sends HTTP POST to ESP32's `/sync` endpoint
3. ESP32 stores schedule and responds with confirmation
4. App updates last sync timestamp in database

### 3. Alert Generation
1. ESP32 checks current time against medicine schedules
2. When time matches, ESP32 triggers buzzer + display
3. React app periodically checks medicine counts
4. When count is low, app generates alert in database

### 4. Real-time Updates
1. Use Supabase real-time subscriptions for live updates
2. Listen for changes in medicine counts and alerts
3. Update UI immediately when data changes
4. Send push notifications for critical alerts

## Security Considerations

### Authentication
- Firebase Auth or Supabase Auth for user management
- JWT tokens for API authentication
- Box pairing requires physical access to device

### Data Protection
- HTTPS only for all web communications
- Encrypted storage of sensitive data
- Box ID as unique identifier (no personal data on ESP32)

### Access Control
- Users can only access their own boxes and medicines
- Box pairing requires both app and physical device
- Sync operations validate Box ID ownership

## Hardware Requirements

### ESP32 Components
- ESP32 DevKit (WiFi + Bluetooth)
- OLED Display (128x64, I2C)
- Buzzer/Speaker
- RTC Module (DS3231)
- LED indicators
- Power supply (USB or battery)

### Optional Enhancements
- Accelerometer for pill counting
- RFID reader for automatic medicine detection
- Camera for pill recognition
- Temperature/humidity sensors
- GSM module for cellular connectivity
```