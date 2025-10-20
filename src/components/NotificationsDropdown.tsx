import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, AlertTriangle, Check, PackageX } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Alert as AlertType } from '../types';

interface NotificationsDropdownProps {
  alerts: AlertType[];
  onDismiss: (alertId: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  alerts,
  onDismiss,
  onMarkAllRead
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayedAlerts, setDisplayedAlerts] = useState<AlertType[]>(alerts);
  const unreadAlerts = displayedAlerts.filter(alert => !alert.isRead);

  // Update displayed alerts immediately when alerts prop changes
  useEffect(() => {
    setDisplayedAlerts(alerts);
  }, [alerts]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low_count':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'medicine_time':
        return <Clock className="h-4 w-4 text-info" />;
      case 'sync_success':
        return <Check className="h-4 w-4 text-success" />;
      case 'out_of_stock':
        return <PackageX className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative bg-white/50 dark:bg-slate-800/50">
          <Bell className="h-4 w-4" />
          {unreadAlerts.length > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {unreadAlerts.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unreadAlerts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>
          {unreadAlerts.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {unreadAlerts.length} unread notification{unreadAlerts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {displayedAlerts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
              <p className="text-xs">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y">
              {displayedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !alert.isRead ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{alert.medicineName}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => onDismiss(alert.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.boxName}</p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(alert.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {displayedAlerts.length > 0 && (
          <div className="p-3 border-t bg-muted/30">
            <p className="text-xs text-center text-muted-foreground">
              Notifications are automatically cleared after 24 hours
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
