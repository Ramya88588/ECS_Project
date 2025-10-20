import React, { useState } from 'react';
import { ArrowLeft, Wifi, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { MedicineBox } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from './auth/AuthProvider';

interface BoxFormProps {
  onBack: () => void;
  onSave: (box: MedicineBox) => void;
}

interface DiscoveredBox {
  id: string;
  name: string;
  boxId: string;
  signalStrength: number;
}

export const BoxForm: React.FC<BoxFormProps> = ({ onBack, onSave }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    boxId: '',
    ipAddress: ''
  });
  const [scanning, setScanning] = useState(false);
  const [discoveredBoxes, setDiscoveredBoxes] = useState<DiscoveredBox[]>([]);
  const [selectedBox, setSelectedBox] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleScanForBoxes = async () => {
    setScanning(true);
    setError('');
    
    try {
      // Mock BLE scanning - in real app, this would use Web Bluetooth API
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockBoxes: DiscoveredBox[] = [
        {
          id: '1',
          name: 'ESP32-MedBox-001',
          boxId: 'ESP32_001_AA:BB:CC:DD:EE:FF',
          signalStrength: -45
        },
        {
          id: '2',
          name: 'ESP32-MedBox-002',
          boxId: 'ESP32_002_FF:EE:DD:CC:BB:AA',
          signalStrength: -60
        },
        {
          id: '3',
          name: 'ESP32-MedBox-003',
          boxId: 'ESP32_003_11:22:33:44:55:66',
          signalStrength: -75
        }
      ];
      
      setDiscoveredBoxes(mockBoxes);
    } catch (err) {
      setError('Failed to scan for devices. Please make sure Bluetooth is enabled.');
    } finally {
      setScanning(false);
    }
  };

  const handleBoxSelect = (boxId: string) => {
    setSelectedBox(boxId);
    setFormData(prev => ({ ...prev, boxId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setCreating(true);
    setError('');
    
    try {
      const newBox = await dataService.createMedicineBox({
        name: formData.name,
        boxId: formData.boxId,
        ipAddress: formData.ipAddress,
        userId: user.id,
        medicines: [],
        isConnected: true
      });
      
      onSave(newBox);
    } catch (err) {
      setError('Failed to create medicine box. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const getSignalStrengthText = (strength: number) => {
    if (strength > -50) return 'Excellent';
    if (strength > -60) return 'Good';
    if (strength > -70) return 'Fair';
    return 'Weak';
  };

  const getSignalStrengthColor = (strength: number) => {
    if (strength > -50) return 'default';
    if (strength > -60) return 'secondary';
    if (strength > -70) return 'outline';
    return 'destructive';
  };

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-blue-100 dark:border-slate-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="hover:bg-blue-50 dark:hover:bg-slate-700">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Search className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Add New Medicine Box</h1>
              <p className="text-muted-foreground text-sm">
                Discover and pair an ESP32 device with your account
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Device Discovery */}
          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-blue-100 dark:border-slate-700 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">1. Discover ESP32 Devices</CardTitle>
              <CardDescription>
                Scan for nearby ESP32 medicine boxes to pair with your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={handleScanForBoxes}
                  disabled={scanning}
                  className="w-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Search className={`h-4 w-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
                  {scanning ? 'Scanning for devices...' : 'Scan for Devices'}
                </Button>

                {discoveredBoxes.length > 0 && (
                  <div className="space-y-2">
                    <Label>Discovered Devices</Label>
                    {discoveredBoxes.map(box => (
                      <Card 
                        key={box.id}
                        className={`cursor-pointer transition-all ${
                          selectedBox === box.boxId ? 'ring-2 ring-primary' : 'hover:shadow-md'
                        }`}
                        onClick={() => handleBoxSelect(box.boxId)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{box.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {box.boxId.split('_')[2]}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={getSignalStrengthColor(box.signalStrength) as any}>
                                <Wifi className="h-3 w-3 mr-1" />
                                {getSignalStrengthText(box.signalStrength)}
                              </Badge>
                              {selectedBox === box.boxId && (
                                <Badge variant="default">Selected</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manual Entry */}
          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-blue-100 dark:border-slate-700 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">2. Box Configuration</CardTitle>
              <CardDescription>
                Give your medicine box a name, confirm the device ID, and enter the IP address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Box Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Kitchen Medicine Box, Bedroom Box"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="boxId">Device ID</Label>
                  <Input
                    id="boxId"
                    type="text"
                    placeholder="ESP32_001_AA:BB:CC:DD:EE:FF"
                    value={formData.boxId}
                    onChange={(e) => setFormData(prev => ({ ...prev, boxId: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Select a device above or enter the ID manually
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ipAddress">ESP32 IP Address</Label>
                  <Input
                    id="ipAddress"
                    type="text"
                    placeholder="192.168.1.100"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, ipAddress: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the IP address of your ESP32 device on your local network
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={creating || !formData.name || !formData.boxId || !formData.ipAddress}
                  >
                    {creating ? 'Creating...' : 'Create Medicine Box'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Alert>
            <AlertDescription>
              <strong>Setup Instructions:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                <li>Make sure your ESP32 medicine box is powered on and connected to WiFi</li>
                <li>Find the IP address of your ESP32 (usually displayed on device or in router settings)</li>
                <li>Click "Scan for Devices" to discover nearby boxes via Bluetooth</li>
                <li>Select your device, enter its IP address, and give it a memorable name</li>
                <li>The box will be paired with your account for future HTTP syncing</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};