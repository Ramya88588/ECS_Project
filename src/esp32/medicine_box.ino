/*
 * Smart Medicine Box - ESP32 Code
 * 
 * Features:
 * - BLE advertising with unique Box ID
 * - WiFi HTTP server for sync API
 * - Medicine schedule storage and alerts
 * - Buzzer and OLED display for notifications
 * - Real-time clock for scheduled reminders
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <EEPROM.h>
#include <Wire.h>
#include <Adafruit_SSD1306.h>
#include <RTClib.h>

// Pin definitions
#define BUZZER_PIN 2
#define LED_PIN 4
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1

// Network credentials - replace with your WiFi details
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Unique Box ID (derived from MAC address)
String boxId;
String deviceName;

// Components
WebServer server(80);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
RTC_DS3231 rtc;

// BLE
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;

// Medicine schedule structure
struct Medicine {
  char name[32];
  int timesPerDay;
  char scheduleTime[64]; // Format: "08:00,14:00,20:00"
  char message[128];
  bool isActive;
};

Medicine medicines[10]; // Support up to 10 medicines
int medicineCount = 0;

// Timing
unsigned long lastAlertCheck = 0;
const unsigned long ALERT_CHECK_INTERVAL = 60000; // Check every minute

void setup() {
  Serial.begin(115200);
  Serial.println("Smart Medicine Box starting...");
  
  // Initialize pins
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // Initialize EEPROM
  EEPROM.begin(512);
  
  // Initialize display
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("SSD1306 allocation failed");
  }
  display.display();
  delay(2000);
  display.clearDisplay();
  
  // Initialize RTC
  if (!rtc.begin()) {
    Serial.println("Couldn't find RTC");
  }
  
  // Generate unique Box ID from MAC address
  uint64_t chipid = ESP.getEfuseMac();
  boxId = "ESP32_" + String((uint32_t)(chipid >> 32), HEX) + "_" + WiFi.macAddress();
  deviceName = "MedBox-" + String((uint32_t)(chipid >> 32), HEX);
  
  Serial.println("Box ID: " + boxId);
  
  // Load saved medicines from EEPROM
  loadMedicinesFromEEPROM();
  
  // Initialize WiFi
  setupWiFi();
  
  // Initialize BLE
  setupBLE();
  
  // Setup HTTP server routes
  setupHTTPServer();
  
  // Display startup message
  displayMessage("Medicine Box", "Ready to sync", "ID: " + deviceName);
  
  Serial.println("Setup complete!");
}

void loop() {
  // Handle HTTP requests
  server.handleClient();
  
  // Check for medicine alerts
  if (millis() - lastAlertCheck > ALERT_CHECK_INTERVAL) {
    checkMedicineAlerts();
    lastAlertCheck = millis();
  }
  
  delay(100);
}

void setupWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.println("IP address: " + WiFi.localIP().toString());
    displayMessage("WiFi Connected", WiFi.localIP().toString(), "Ready for sync");
  } else {
    Serial.println("WiFi connection failed");
    displayMessage("WiFi Failed", "Check credentials", "BLE only mode");
  }
}

void setupBLE() {
  BLEDevice::init(deviceName);
  pServer = BLEDevice::createServer();
  
  BLEService *pService = pServer->createService("12345678-1234-1234-1234-123456789abc");
  
  pCharacteristic = pService->createCharacteristic(
    "87654321-4321-4321-4321-cba987654321",
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  
  // Set the Box ID as the characteristic value
  pCharacteristic->setValue(boxId.c_str());
  
  pService->start();
  
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID("12345678-1234-1234-1234-123456789abc");
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  
  BLEDevice::startAdvertising();
  Serial.println("BLE advertising started");
}

void setupHTTPServer() {
  // CORS headers
  server.onNotFound([]() {
    if (server.method() == HTTP_OPTIONS) {
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
      server.send(200);
    } else {
      server.send(404, "text/plain", "Not found");
    }
  });
  
  // GET /info - Return box info and current schedule
  server.on("/info", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    
    DynamicJsonDocument doc(2048);
    doc["boxId"] = boxId;
    doc["deviceName"] = deviceName;
    doc["status"] = "online";
    doc["medicineCount"] = medicineCount;
    doc["wifiConnected"] = (WiFi.status() == WL_CONNECTED);
    doc["ipAddress"] = WiFi.localIP().toString();
    
    JsonArray medicinesArray = doc.createNestedArray("medicines");
    for (int i = 0; i < medicineCount; i++) {
      if (medicines[i].isActive) {
        JsonObject med = medicinesArray.createNestedObject();
        med["name"] = medicines[i].name;
        med["timesPerDay"] = medicines[i].timesPerDay;
        med["scheduleTime"] = medicines[i].scheduleTime;
        med["message"] = medicines[i].message;
      }
    }
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });
  
  // POST /sync - Receive new medicine schedule
  server.on("/sync", HTTP_POST, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    
    if (server.hasArg("plain")) {
      String body = server.arg("plain");
      Serial.println("Received sync data: " + body);
      
      DynamicJsonDocument doc(2048);
      DeserializationError error = deserializeJson(doc, body);
      
      if (error) {
        server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"Invalid JSON\"}");
        return;
      }
      
      // Clear existing medicines
      medicineCount = 0;
      memset(medicines, 0, sizeof(medicines));
      
      // Parse new medicines
      JsonArray medicinesArray = doc["medicines"];
      for (JsonObject med : medicinesArray) {
        if (medicineCount < 10) {
          strncpy(medicines[medicineCount].name, med["name"], 31);
          medicines[medicineCount].timesPerDay = med["timesPerDay"];
          strncpy(medicines[medicineCount].scheduleTime, med["scheduleTime"], 63);
          strncpy(medicines[medicineCount].message, med["message"], 127);
          medicines[medicineCount].isActive = true;
          medicineCount++;
        }
      }
      
      // Save to EEPROM
      saveMedicinesToEEPROM();
      
      // Show success on display
      displayMessage("Sync Complete", String(medicineCount) + " medicines", "Schedule updated");
      
      // Buzz confirmation
      buzzPattern(2, 200, 100);
      
      server.send(200, "application/json", "{\"status\":\"success\",\"message\":\"Schedule updated\"}");
      
      Serial.println("Schedule updated with " + String(medicineCount) + " medicines");
    } else {
      server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"No data received\"}");
    }
  });
  
  server.begin();
  Serial.println("HTTP server started");
}

void checkMedicineAlerts() {
  DateTime now = rtc.now();
  String currentTime = String(now.hour()) + ":" + String(now.minute(), DEC < 10 ? "0" : "") + String(now.minute());
  
  for (int i = 0; i < medicineCount; i++) {
    if (!medicines[i].isActive) continue;
    
    // Parse schedule times
    String schedule = String(medicines[i].scheduleTime);
    int startPos = 0;
    int commaPos;
    
    do {
      commaPos = schedule.indexOf(',', startPos);
      String timeSlot = (commaPos == -1) ? schedule.substring(startPos) : schedule.substring(startPos, commaPos);
      
      if (timeSlot == currentTime) {
        triggerMedicineAlert(i);
      }
      
      startPos = commaPos + 1;
    } while (commaPos != -1);
  }
}

void triggerMedicineAlert(int medicineIndex) {
  Medicine& med = medicines[medicineIndex];
  
  Serial.println("Medicine alert: " + String(med.name));
  
  // Show on display
  displayMessage("Medicine Time!", med.name, med.message);
  
  // Buzz pattern
  buzzPattern(5, 300, 200);
  
  // Keep display on for 30 seconds
  delay(30000);
  displayMessage("Medicine Box", "Next reminder", "at scheduled time");
}

void buzzPattern(int count, int onTime, int offTime) {
  for (int i = 0; i < count; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_PIN, HIGH);
    delay(onTime);
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(LED_PIN, LOW);
    if (i < count - 1) delay(offTime);
  }
}

void displayMessage(String line1, String line2, String line3) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  
  display.setCursor(0, 0);
  display.println(line1);
  
  display.setCursor(0, 20);
  display.println(line2);
  
  display.setCursor(0, 40);
  display.println(line3);
  
  display.display();
}

void saveMedicinesToEEPROM() {
  int addr = 0;
  EEPROM.write(addr++, medicineCount);
  
  for (int i = 0; i < medicineCount; i++) {
    EEPROM.put(addr, medicines[i]);
    addr += sizeof(Medicine);
  }
  
  EEPROM.commit();
  Serial.println("Medicines saved to EEPROM");
}

void loadMedicinesFromEEPROM() {
  int addr = 0;
  medicineCount = EEPROM.read(addr++);
  
  if (medicineCount > 10) {
    medicineCount = 0; // Invalid data
    return;
  }
  
  for (int i = 0; i < medicineCount; i++) {
    EEPROM.get(addr, medicines[i]);
    addr += sizeof(Medicine);
  }
  
  Serial.println("Loaded " + String(medicineCount) + " medicines from EEPROM");
}