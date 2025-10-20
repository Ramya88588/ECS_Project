import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import { AuthPage } from './components/auth/AuthPage';
import { Dashboard } from './components/Dashboard';
import { MedicineForm } from './components/MedicineForm';
import { MedicineList } from './components/MedicineList';
import { BoxForm } from './components/BoxForm';
import { NotificationsDropdown } from './components/NotificationsDropdown';
import { MedicineBox, Medicine, Alert } from './types';
import { dataService } from './services/dataService';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Button } from './components/ui/button';
import { Activity, ArrowLeft } from 'lucide-react';

type AppState = 
  | { view: 'dashboard' }
  | { view: 'medicine-list'; box: MedicineBox }
  | { view: 'medicine-form'; box: MedicineBox; editing?: Medicine }
  | { view: 'box-form' };

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [appState, setAppState] = useState<AppState>({ view: 'dashboard' });
  const [medicineBoxes, setMedicineBoxes] = useState<MedicineBox[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Load initial data when user is available
  React.useEffect(() => {
    if (user) {
      refreshMedicineBoxes();
      loadAlerts();
    }
  }, [user]);

  const updateMedicineBox = (updatedBox: MedicineBox) => {
    setMedicineBoxes(prev => 
      prev.map(box => box.id === updatedBox.id ? updatedBox : box)
    );
    setLastUpdateTime(new Date());
  };

  const refreshMedicineBoxes = async () => {
    if (!user) return;
    try {
      const freshBoxes = await dataService.getMedicineBoxes(user.id);
      setMedicineBoxes(freshBoxes);
    } catch (error) {
      console.error('Failed to refresh medicine boxes:', error);
    }
  };

  const handleSelectBox = (box: MedicineBox) => {
    setAppState({ view: 'medicine-list', box });
  };

  const handleCreateBox = () => {
    setAppState({ view: 'box-form' });
  };

  const handleBoxCreated = (newBox: MedicineBox) => {
    setMedicineBoxes(prev => [...prev, newBox]);
    setAppState({ view: 'medicine-list', box: newBox });
    toast.success('Medicine box created successfully!');
  };

  const handleAddMedicine = (box: MedicineBox) => {
    setAppState({ view: 'medicine-form', box });
  };

  const handleEditMedicine = (box: MedicineBox, medicine: Medicine) => {
    setAppState({ view: 'medicine-form', box, editing: medicine });
  };

  const handleMedicineSaved = async (box: MedicineBox, medicineData: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (appState.view === 'medicine-form' && appState.editing) {
        // Update existing medicine
        const updatedMedicine = await dataService.updateMedicine(box.id, appState.editing.id, medicineData);
        const updatedMedicines = box.medicines.map(m => 
          m.id === appState.editing!.id ? updatedMedicine : m
        );
        const updatedBox = { ...box, medicines: updatedMedicines };
        updateMedicineBox(updatedBox);
        setAppState({ view: 'medicine-list', box: updatedBox });
        toast.success('Medicine updated successfully!');
      } else {
        // Add new medicine - get fresh data from service to avoid duplicates
        const newMedicine = await dataService.addMedicine(box.id, medicineData);
        const freshBoxData = await dataService.getMedicineBoxes(box.userId);
        const updatedBox = freshBoxData.find(b => b.id === box.id);
        
        if (updatedBox) {
          updateMedicineBox(updatedBox);
          setAppState({ view: 'medicine-list', box: updatedBox });
        }
        toast.success('Medicine added successfully!');
      }
      // Reload alerts to reflect changes
    } catch (error) {
      console.error('Error saving medicine:', error);
      toast.error('Failed to save medicine. Please try again.');
    }
  };

  const handleBackToDashboard = () => {
    setAppState({ view: 'dashboard' });
    loadAlerts();
  };

  const dismissAlert = async (alertId: string) => {
    await dataService.markAlertAsRead(alertId);
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const markAllAlertsRead = async () => {
    if (!user) return;
    await dataService.markAllAlertsAsRead(user.id);
    setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
  };

  const loadAlerts = async () => {
    if (!user) return;
    try {
      const userAlerts = await dataService.getAlerts(user.id);
      setAlerts(userAlerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {/* Background pattern - fixed to viewport */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.15)_1px,transparent_0)] [background-size:24px_24px] z-0"></div>
        
        <div className="relative flex items-center justify-center min-h-screen z-10">
          <div className="text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-blue-100 dark:border-slate-700">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-primary mx-auto"></div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 to-secondary/20 animate-pulse"></div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Loading Smart Medicine Box</h3>
            <p className="text-muted-foreground">Setting up your medical dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {/* Background pattern - fixed to viewport */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.15)_1px,transparent_0)] [background-size:24px_24px] z-0"></div>
        <div className="relative z-10">
          <AuthPage />
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (appState.view) {
      case 'dashboard':
        return (
          <div className="pt-6"> {/* Reduced top padding for tighter spacing */}
            <Dashboard
              onSelectBox={handleSelectBox}
              onCreateBox={handleCreateBox}
              onMedicineBoxesUpdated={() => {
                refreshMedicineBoxes();
                loadAlerts();
              }}
            />
          </div>
        );

      case 'box-form':
        return (
          <BoxForm
            onBack={handleBackToDashboard}
            onSave={handleBoxCreated}
          />
        );

      case 'medicine-list':
        return (
          <MedicineList
            medicineBox={appState.box}
            onBack={handleBackToDashboard}
            onAddMedicine={() => handleAddMedicine(appState.box)}
            onEditMedicine={(medicine) => handleEditMedicine(appState.box, medicine)}
            onUpdateBox={updateMedicineBox}
            onMedicineDeleted={loadAlerts}
          />
        );

      case 'medicine-form':
        return (
          <MedicineForm
            onBack={() => setAppState({ view: 'medicine-list', box: appState.box })}
            onSave={(medicineData) => handleMedicineSaved(appState.box, medicineData)}
            editingMedicine={appState.editing}
          />
        );

      default:
        return (
          <div className="pt-6"> {/* Reduced top padding for tighter spacing */}
            <Dashboard onSelectBox={handleSelectBox} onCreateBox={handleCreateBox} onMedicineBoxesUpdated={() => {
              refreshMedicineBoxes();
              loadAlerts();
            }} />
          </div>
        );
    }
  };

  const getPageTitle = () => {
    switch (appState.view) {
      case 'dashboard':
        return 'Dashboard';
      case 'box-form':
        return 'Add New Medicine Box';
      case 'medicine-list':
        return appState.box.name;
      case 'medicine-form':
        return appState.editing ? 'Edit Medicine' : 'Add New Medicine';
      default:
        return 'Smart Medicine Box';
    }
  };

  const shouldShowBackButton = () => {
    return appState.view !== 'dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background pattern - fixed to viewport */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.15)_1px,transparent_0)] [background-size:24px_24px] z-0"></div>
      
      {/* Subtle medical icons background - fixed to viewport */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30 z-0">
        <div className="absolute top-20 left-20 w-4 h-4 bg-primary/5 rounded-full"></div>
        <div className="absolute top-40 right-32 w-3 h-3 bg-secondary/5 rounded-full"></div>
        <div className="absolute bottom-40 left-16 w-5 h-5 bg-accent/5 rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-2 h-2 bg-primary/5 rounded-full"></div>
        <div className="absolute top-1/3 left-1/3 w-6 h-6 bg-secondary/3 rounded-full"></div>
        <div className="absolute top-2/3 right-1/4 w-4 h-4 bg-accent/3 rounded-full"></div>
      </div>

      {/* Sticky Header - Only show on Dashboard */}
      {appState.view === 'dashboard' && (
        <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-blue-100 dark:border-slate-700 relative">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Smart Medicine Box
                  </h1>
                  <p className="text-muted-foreground">Dashboard - Welcome back, {user?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <NotificationsDropdown
                  alerts={alerts}
                  onDismiss={dismissAlert}
                  onMarkAllRead={markAllAlertsRead}
                />
                <Button variant="outline" size="sm" onClick={logout} className="bg-white/50 dark:bg-slate-800/50">
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Content */}
      <div className="relative z-10">
        {renderContent()}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        }}
      />
    </AuthProvider>
  );
}