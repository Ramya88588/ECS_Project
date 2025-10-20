import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Medicine } from '../types';

interface MedicineFormProps {
  onBack: () => void;
  onSave: (medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editingMedicine?: Medicine;
}

export const MedicineForm: React.FC<MedicineFormProps> = ({ onBack, onSave, editingMedicine }) => {
  const [formData, setFormData] = useState({
    name: '',
    timesPerDay: 1,
    totalCount: 0,
    currentCount: 0,
    customMessage: '',
    scheduleTime: ''
  });
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(['08:00']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingMedicine) {
      setFormData({
        name: editingMedicine.name,
        timesPerDay: editingMedicine.timesPerDay,
        totalCount: editingMedicine.totalCount,
        currentCount: editingMedicine.currentCount,
        customMessage: editingMedicine.customMessage || '',
        scheduleTime: editingMedicine.scheduleTime
      });
      setScheduleTimes(editingMedicine.scheduleTime.split(','));
    }
  }, [editingMedicine]);

  const handleTimesPerDayChange = (value: string) => {
    const times = parseInt(value);
    setFormData(prev => ({ ...prev, timesPerDay: times }));
    
    // Adjust schedule times based on frequency
    const defaultTimes = {
      1: ['08:00'],
      2: ['08:00', '20:00'],
      3: ['08:00', '14:00', '20:00'],
      4: ['08:00', '12:00', '16:00', '20:00']
    };
    
    setScheduleTimes(defaultTimes[times as keyof typeof defaultTimes] || ['08:00']);
  };

  const updateScheduleTime = (index: number, time: string) => {
    const newTimes = [...scheduleTimes];
    newTimes[index] = time;
    setScheduleTimes(newTimes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent duplicate submissions
    
    setIsSubmitting(true);
    
    try {
      const medicineData = {
        ...formData,
        scheduleTime: scheduleTimes.join(','),
        currentCount: formData.currentCount || formData.totalCount
      };
      
      await onSave(medicineData);
    } catch (error) {
      console.error('Error saving medicine:', error);
    } finally {
      setIsSubmitting(false);
    }
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
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {editingMedicine ? 'Update medicine details and schedule' : 'Fill in medicine information and dosage schedule'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-blue-100 dark:border-slate-700 shadow-lg">
            <CardHeader className="pb-6">
              <CardTitle className="text-gray-900 dark:text-white">Medicine Details</CardTitle>
              <CardDescription className="text-muted-foreground">
                Fill in the information about your medicine and dosage schedule.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-gray-900 dark:text-white">Medicine Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g., Vitamin D, Aspirin"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-input-background border-blue-200 dark:border-slate-600 focus:border-primary focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="totalCount" className="text-gray-900 dark:text-white">Total Count</Label>
                      <Input
                        id="totalCount"
                        type="number"
                        min="1"
                        placeholder="e.g., 30"
                        value={formData.totalCount || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, totalCount: parseInt(e.target.value) || 0 }))}
                        className="bg-input-background border-blue-200 dark:border-slate-600 focus:border-primary focus:ring-primary/20"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="currentCount" className="text-gray-900 dark:text-white">Current Count</Label>
                      <Input
                        id="currentCount"
                        type="number"
                        min="0"
                        placeholder="Leave empty to use total count"
                        value={formData.currentCount || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, currentCount: parseInt(e.target.value) || 0 }))}
                        className="bg-input-background border-blue-200 dark:border-slate-600 focus:border-primary focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Schedule Configuration */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="timesPerDay" className="text-gray-900 dark:text-white">Times Per Day</Label>
                    <Select
                      value={formData.timesPerDay.toString()}
                      onValueChange={handleTimesPerDayChange}
                    >
                      <SelectTrigger className="bg-input-background border-blue-200 dark:border-slate-600 focus:border-primary focus:ring-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600">
                        <SelectItem value="1">Once daily</SelectItem>
                        <SelectItem value="2">Twice daily</SelectItem>
                        <SelectItem value="3">Three times daily</SelectItem>
                        <SelectItem value="4">Four times daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-gray-900 dark:text-white">Schedule Times</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {scheduleTimes.map((time, index) => (
                        <div key={`dose-${index}-${time}`} className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Dose {index + 1}</Label>
                          <Input
                            type="time"
                            value={time}
                            onChange={(e) => updateScheduleTime(index, e.target.value)}
                            className="bg-input-background border-blue-200 dark:border-slate-600 focus:border-primary focus:ring-primary/20"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Custom Message */}
                <div className="space-y-3">
                  <Label htmlFor="customMessage" className="text-gray-900 dark:text-white">Custom Message (Optional)</Label>
                  <Textarea
                    id="customMessage"
                    placeholder="e.g., Take with food, Don't take on empty stomach"
                    value={formData.customMessage}
                    onChange={(e) => setFormData(prev => ({ ...prev, customMessage: e.target.value }))}
                    rows={3}
                    className="bg-input-background border-blue-200 dark:border-slate-600 focus:border-primary focus:ring-primary/20"
                  />
                </div>

                {/* Preview */}
                <div className="border border-blue-200 dark:border-slate-600 rounded-xl p-6 bg-gradient-to-r from-primary/5 to-secondary/5">
                  <h4 className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                    <Clock className="h-4 w-4 text-primary" />
                    Schedule Preview
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {scheduleTimes.map((time, index) => (
                      <Badge key={`preview-${index}-${time}`} variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {time}
                      </Badge>
                    ))}
                  </div>
                  {formData.totalCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      This schedule will last approximately {Math.floor(formData.totalCount / formData.timesPerDay)} days
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onBack} 
                    className="flex-1 bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700" 
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300" 
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Saving...' : (editingMedicine ? 'Update Medicine' : 'Add Medicine')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};