import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Wifi, Clock, AlertTriangle, RotateCcw, Activity, WifiOff, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Progress } from './ui/progress';
import { MedicineBox, Medicine } from '../types';
import { dataService } from '../services/dataService';
import { esp32Service } from '../services/esp32Service';
import { toast } from 'sonner';

interface MedicineListProps {
  medicineBox: MedicineBox;
  onBack: () => void;
  onAddMedicine: () => void;
  onEditMedicine: (medicine: Medicine) => void;
  onUpdateBox: (box: MedicineBox) => void;
  onMedicineDeleted?: () => void;
}

export const MedicineList: React.FC<MedicineListProps> = ({
  medicineBox,
  onBack,
  onAddMedicine,
  onEditMedicine,
  onUpdateBox,
  onMedicineDeleted
}) => {
  const [medicines, setMedicines] = useState<Medicine[]>(medicineBox.medicines);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; medicine?: Medicine }>({ open: false });
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  useEffect(() => {
    setMedicines(medicineBox.medicines);
  }, [medicineBox.medicines]);

  const handleDeleteMedicine = async (medicine: Medicine) => {
    try {
      await dataService.deleteMedicine(medicineBox.id, medicine.id);
      const updatedMedicines = medicines.filter(m => m.id !== medicine.id);
      setMedicines(updatedMedicines);
      onUpdateBox({ ...medicineBox, medicines: updatedMedicines });
      setDeleteDialog({ open: false });
      toast.success(`${medicine.name} deleted successfully. Related notifications removed.`);
      // Notify parent to reload alerts
      if (onMedicineDeleted) {
        onMedicineDeleted();
      }
    } catch (error) {
      console.error('Failed to delete medicine:', error);
      toast.error('Failed to delete medicine. Please try again.');
    }
  };

  const handleSyncWithESP32 = async () => {
    if (syncing) return; // Prevent duplicate sync requests
    
    setSyncing(true);
    setSyncStatus({ type: null, message: '' });
    
    try {
      const result = await esp32Service.syncMedicines(medicineBox);
      
      if (result.success) {
        setSyncStatus({ 
          type: 'success', 
          message: result.message
        });
        
        // Update last sync time
        const updatedBox = await dataService.updateMedicineBox(medicineBox.id, {
          lastSyncAt: new Date()
        });
        onUpdateBox(updatedBox);
      } else {
        setSyncStatus({ 
          type: 'error', 
          message: result.message
        });
      }
      
    } catch (error) {
      console.error('ESP32 sync error:', error);
      setSyncStatus({ 
        type: 'error', 
        message: 'Failed to sync with ESP32. Please check device connection.' 
      });
    } finally {
      setSyncing(false);
      
      // Clear sync status after 5 seconds
      setTimeout(() => {
        setSyncStatus({ type: null, message: '' });
      }, 5000);
    }
  };

  const handleConnectESP32 = async () => {
    if (connecting) return;
    
    setConnecting(true);
    setSyncStatus({ type: null, message: '' });
    
    try {
      const result = await esp32Service.testConnection(medicineBox.ipAddress);
      
      if (result.success) {
        setSyncStatus({ 
          type: 'success', 
          message: result.message 
        });
        
        // Update box connection status
        const updatedBox = await dataService.updateMedicineBox(medicineBox.id, {
          isConnected: true,
          lastSyncAt: new Date()
        });
        onUpdateBox(updatedBox);
      } else {
        setSyncStatus({ 
          type: 'error', 
          message: result.message 
        });
      }
    } catch (error) {
      console.error('ESP32 connection error:', error);
      setSyncStatus({ 
        type: 'error', 
        message: 'Failed to connect to ESP32 device. Please try again.' 
      });
    } finally {
      setConnecting(false);
      
      // Clear status after 5 seconds
      setTimeout(() => {
        setSyncStatus({ type: null, message: '' });
      }, 5000);
    }
  };

  const getMedicineStatus = (medicine: Medicine) => {
    const daysRemaining = medicine.currentCount / medicine.timesPerDay;
    if (daysRemaining <= 0) return { color: 'destructive', text: 'Empty' };
    if (daysRemaining <= 3) return { color: 'destructive', text: 'Low' };
    if (daysRemaining <= 7) return { color: 'secondary', text: 'Medium' };
    return { color: 'default', text: 'Good' };
  };

  const getProgressPercentage = (medicine: Medicine) => {
    return Math.max(0, (medicine.currentCount / medicine.totalCount) * 100);
  };

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-blue-100 dark:border-slate-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="hover:bg-blue-50 dark:hover:bg-slate-700">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{medicineBox.name}</h1>
                <p className="text-muted-foreground text-sm font-mono">
                  Box ID: {medicineBox.boxId.split('_')[2]?.substring(0, 12)}...
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={medicineBox.isConnected ? 'default' : 'secondary'} 
                     className={medicineBox.isConnected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700'}>
                {medicineBox.isConnected ? (
                  <Wifi className="h-3 w-3 mr-1" />
                ) : (
                  <WifiOff className="h-3 w-3 mr-1" />
                )}
                {medicineBox.isConnected ? 'Connected' : 'Offline'}
              </Badge>
              
              {!medicineBox.isConnected ? (
                <Button 
                  onClick={handleConnectESP32}
                  disabled={connecting}
                  variant="outline"
                  className="bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${connecting ? 'animate-spin' : ''}`} />
                  {connecting ? 'Connecting...' : 'Connect'}
                </Button>
              ) : (
                <Button 
                  onClick={handleSyncWithESP32}
                  disabled={syncing}
                  variant="outline"
                  className="bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700"
                >
                  <RotateCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Sync Status */}
        {syncStatus.type && (
          <Alert variant={syncStatus.type === 'error' ? 'destructive' : 'default'} 
                 className="mb-8 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-blue-100 dark:border-slate-700 shadow-sm">
            <AlertDescription>{syncStatus.message}</AlertDescription>
          </Alert>
        )}

        {/* Medicines Section */}
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Medicines ({medicines.length})</h3>
          <Button onClick={onAddMedicine} className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300">
            <Plus className="h-4 w-4 mr-2" />
            Add Medicine
          </Button>
        </div>

        {medicines.length === 0 ? (
          <Card className="text-center py-20 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-blue-100 dark:border-slate-700 shadow-lg">
            <CardContent className="px-8">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
                <Plus className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">No Medicines Added</h3>
              <p className="text-muted-foreground mb-10 max-w-md mx-auto">
                Add your first medicine to this box to start tracking dosages and receive automated reminders.
              </p>
              <Button onClick={onAddMedicine} size="lg" className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300">
                <Plus className="h-5 w-5 mr-2" />
                Add First Medicine
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8">
            {medicines.map((medicine, medicineIndex) => {
              const status = getMedicineStatus(medicine);
              const progressPercentage = getProgressPercentage(medicine);
              const scheduleArray = medicine.scheduleTime.split(',').filter(time => time.trim());
              // Create a unique key using both index and ID to prevent duplicates
              const cardKey = `medicine-card-${medicineIndex}-${medicine.id}`;
              
              return (
                <Card key={cardKey} className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-blue-100 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
                          {medicine.name}
                          <Badge variant={status.color as any} className={
                            status.color === 'destructive' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            status.color === 'secondary' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }>
                            {status.text}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {medicine.timesPerDay} time{medicine.timesPerDay > 1 ? 's' : ''} per day
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditMedicine(medicine)}
                          className="hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, medicine })}
                          className="hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Count Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Remaining Pills</span>
                          <span className="font-medium">{medicine.currentCount} / {medicine.totalCount}</span>
                        </div>
                        <Progress value={progressPercentage} className="h-3" />
                        <p className="text-xs text-muted-foreground mt-2">
                          Approximately {Math.floor(medicine.currentCount / medicine.timesPerDay)} days remaining
                        </p>
                      </div>

                      {/* Schedule */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Schedule</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {scheduleArray.map((time, timeIndex) => {
                            // Create a more unique key using multiple identifiers
                            const timeKey = `schedule-${medicineIndex}-${timeIndex}-${time.trim()}-${medicine.id.slice(-4)}`;
                            return (
                              <Badge 
                                key={timeKey}
                                variant="outline"
                                className="bg-primary/5 border-primary/20 text-primary"
                              >
                                {time.trim()}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Message */}
                      {medicine.customMessage && (
                        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-4 border border-primary/10">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{medicine.customMessage}</p>
                        </div>
                      )}

                      {/* Low Count Warning */}
                      {medicine.currentCount / medicine.timesPerDay <= 3 && (
                        <Alert variant="destructive" className="bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            This medicine is running low! Consider refilling soon.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onOpenChange={(open:any) => setDeleteDialog({ open })}>
          <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-blue-100 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle>Delete Medicine</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deleteDialog.medicine?.name}"? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialog({ open: false })}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => deleteDialog.medicine && handleDeleteMedicine(deleteDialog.medicine)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};