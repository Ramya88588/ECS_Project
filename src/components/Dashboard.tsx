import React, { useState, useEffect } from 'react';
import { Plus, Settings, Wifi, WifiOff, Activity, Clock, AlertTriangle, Trash2, RefreshCw, Plug, PlugZap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { MedicineBox, Alert as AlertType } from '../types';
import { dataService } from '../services/dataService';
import { esp32Service } from '../services/esp32Service';
import { useAuth } from './auth/AuthProvider';
import { toast } from 'sonner';

interface DashboardProps {
  onSelectBox: (box: MedicineBox) => void;
  onCreateBox: () => void;
  onMedicineBoxesUpdated?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectBox, onCreateBox, onMedicineBoxesUpdated }) => {
  const { user, logout } = useAuth();
  const [medicineBoxes, setMedicineBoxes] = useState<MedicineBox[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingBoxes, setConnectingBoxes] = useState<Set<string>>(new Set());
  const [syncingBoxes, setSyncingBoxes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadData();
      
      // Check for medicine times every minute and low medicines every 30 seconds
      const timeInterval = setInterval(() => {
        const timeAlerts = dataService.checkMedicineTimes();
        if (timeAlerts.length > 0) {
          setAlerts(prev => [...prev, ...timeAlerts]);
          // Reload medicine boxes to reflect updated counts
          loadData();
          onMedicineBoxesUpdated?.();
        }
      }, 60000); // Check every minute for medicine times

      const lowMedicineInterval = setInterval(() => {
        const lowAlerts = dataService.checkLowMedicines();
        if (lowAlerts.length > 0) {
          setAlerts(prev => [...prev, ...lowAlerts]);
        }
      }, 30000); // Check every 30 seconds for low medicines
      
      // Initial check for medicine times (in case we missed any)
      setTimeout(() => {
        const initialTimeAlerts = dataService.checkMedicineTimes();
        if (initialTimeAlerts.length > 0) {
          setAlerts(prev => [...prev, ...initialTimeAlerts]);
          loadData();
          onMedicineBoxesUpdated?.();
        }
      }, 1000);
      
      return () => {
        clearInterval(timeInterval);
        clearInterval(lowMedicineInterval);
      };
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [boxes, userAlerts] = await Promise.all([
        dataService.getMedicineBoxes(user.id),
        dataService.getAlerts(user.id)
      ]);
      setMedicineBoxes(boxes);
      setAlerts(userAlerts);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleDeleteBox = async (boxId: string, boxName: string) => {
    try {
      await dataService.deleteMedicineBox(boxId);
      setMedicineBoxes(prev => prev.filter(box => box.id !== boxId));
      toast.success(`${boxName} has been deleted successfully!`);
    } catch (error) {
      console.error('Failed to delete medicine box:', error);
      toast.error('Failed to delete medicine box. Please try again.');
    }
  };

  const handleConnectBox = async (box: MedicineBox) => {
    if (connectingBoxes.has(box.id)) return;

    setConnectingBoxes(prev => new Set(prev).add(box.id));
    
    try {
      const result = await esp32Service.testConnection(box.ipAddress);
      
      if (result.success) {
        // Update box connection status
        const updatedBox = { ...box, isConnected: true };
        setMedicineBoxes(prev => 
          prev.map(b => b.id === box.id ? updatedBox : b)
        );
        await dataService.updateMedicineBox(box.id, updatedBox);
        toast.success(`Connected to ${box.name}: ${result.message}`);
      } else {
        toast.error(`Failed to connect to ${box.name}: ${result.message}`);
      }
    } catch (error) {
      console.error('Connection failed:', error);
      toast.error(`Connection failed: Unable to reach ${box.name}`);
    } finally {
      setConnectingBoxes(prev => {
        const newSet = new Set(prev);
        newSet.delete(box.id);
        return newSet;
      });
    }
  };

  const handleDisconnectBox = async (box: MedicineBox) => {
    if (connectingBoxes.has(box.id)) return;

    setConnectingBoxes(prev => new Set(prev).add(box.id));
    
    try {
      await esp32Service.disconnect(box.ipAddress);
      
      // Update box connection status
      const updatedBox = { ...box, isConnected: false };
      setMedicineBoxes(prev => 
        prev.map(b => b.id === box.id ? updatedBox : b)
      );
      await dataService.updateMedicineBox(box.id, updatedBox);
      toast.success(`Disconnected from ${box.name}`);
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast.error(`Failed to disconnect from ${box.name}`);
    } finally {
      setConnectingBoxes(prev => {
        const newSet = new Set(prev);
        newSet.delete(box.id);
        return newSet;
      });
    }
  };

  const handleSyncBox = async (box: MedicineBox) => {
    if (syncingBoxes.has(box.id)) return;

    setSyncingBoxes(prev => new Set(prev).add(box.id));
    
    try {
      const result = await esp32Service.syncMedicines(box);
      
      if (result.success) {
        // Update last sync time
        const updatedBox = { ...box, lastSyncAt: new Date() };
        setMedicineBoxes(prev => 
          prev.map(b => b.id === box.id ? updatedBox : b)
        );
        await dataService.updateMedicineBox(box.id, updatedBox);
        toast.success(`Sync completed for ${box.name}: ${result.message}`);
      } else {
        toast.error(`Sync failed for ${box.name}: ${result.message}`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error(`Sync failed: Unable to reach ${box.name}`);
    } finally {
      setSyncingBoxes(prev => {
        const newSet = new Set(prev);
        newSet.delete(box.id);
        return newSet;
      });
    }
  };

  const handleBoxClick = (box: MedicineBox) => {
    onSelectBox(box);
  };

  const unreadAlerts = alerts.filter(alert => !alert.isRead);
  const connectedBoxes = medicineBoxes.filter(box => box.isConnected).length;
  const totalMedicines = medicineBoxes.reduce((total, box) => total + box.medicines.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-blue-100 dark:border-slate-700">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 to-secondary/20 animate-pulse"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Loading your medicine boxes...</h3>
          <p className="text-muted-foreground">Setting up your medical dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-blue-100 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Total Medicine Boxes</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold text-primary mb-1">{medicineBoxes.length}</div>
            <p className="text-xs text-muted-foreground">
              {connectedBoxes} connected
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-blue-100 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Total Medicines</CardTitle>
            <Clock className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold text-secondary mb-1">{totalMedicines}</div>
            <p className="text-xs text-muted-foreground">
              Across all boxes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-blue-100 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold text-warning mb-1">{unreadAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>



      {/* Medicine Boxes Grid */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Medicine Boxes</h2>
        <Button onClick={onCreateBox} className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300">
          <Plus className="h-4 w-4 mr-2" />
          Add New Box
        </Button>
      </div>

      {medicineBoxes.length === 0 ? (
        <Card className="text-center py-20 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-blue-100 dark:border-slate-700 shadow-lg">
          <CardContent className="px-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <Activity className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">No Medicine Boxes Yet</h3>
            <p className="text-muted-foreground mb-10 max-w-md mx-auto">
              Create your first medicine box to start managing your medications and receive automated reminders.
            </p>
            <Button onClick={onCreateBox} size="lg" className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300">
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Box
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medicineBoxes.map(box => (
            <Card 
              key={box.id} 
              className="hover:shadow-xl transition-all duration-300 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-blue-100 dark:border-slate-700 hover:scale-105 group cursor-pointer"
              onClick={() => handleBoxClick(box)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 hover:text-primary transition-colors duration-200">
                    <div className={`w-3 h-3 rounded-full ${box.isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <span className="text-gray-900 dark:text-white">{box.name}</span>
                    {box.isConnected ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="hover:bg-blue-50 dark:hover:bg-slate-700 text-muted-foreground hover:text-primary transition-colors duration-200"
                      onClick={(e:any) => {
                        e.stopPropagation();
                        // Settings functionality - could open a settings dialog
                        toast.info('Settings feature coming soon!');
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-destructive transition-colors duration-200">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-blue-100 dark:border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-gray-900 dark:text-white">Delete Medicine Box</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            Are you sure you want to delete "{box.name}"? This action cannot be undone. 
                            All medicines and data associated with this box will be permanently removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={(e:any) => {
                              e.stopPropagation();
                              handleDeleteBox(box.id, box.name);
                            }}
                            className="bg-destructive hover:bg-destructive/90 text-white shadow-lg"
                          >
                            Delete Box
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardDescription className="text-xs font-mono mt-2 text-muted-foreground">
                  Box ID: {box.boxId.split('_')[2]?.substring(0, 8)}... | IP: {box.ipAddress}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Medicines:</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {box.medicines.length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={box.isConnected ? 'default' : 'secondary'} className={box.isConnected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600'}>
                      {box.isConnected ? 'Connected' : 'Offline'}
                    </Badge>
                  </div>
                  {box.lastSyncAt && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Last Sync:</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(box.lastSyncAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* ESP32 Control Buttons */}
                <div className="flex gap-2 mt-4">
                  {box.isConnected ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleDisconnectBox(box)}
                      disabled={connectingBoxes.has(box.id)}
                    >
                      {connectingBoxes.has(box.id) ? (
                        <PlugZap className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Plug className="h-3 w-3 mr-1" />
                      )}
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleConnectBox(box)}
                      disabled={connectingBoxes.has(box.id)}
                    >
                      {connectingBoxes.has(box.id) ? (
                        <PlugZap className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <PlugZap className="h-3 w-3 mr-1" />
                      )}
                      Connect
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleSyncBox(box)}
                    disabled={syncingBoxes.has(box.id) || !box.isConnected}
                  >
                    {syncingBoxes.has(box.id) ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Sync
                  </Button>
                </div>

                <Button 
                  className="w-full mt-4 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-md hover:shadow-lg transition-all duration-300" 
                  onClick={() => handleBoxClick(box)}
                >
                  Manage Medicines
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};