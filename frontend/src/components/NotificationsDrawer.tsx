import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNotifications } from '@/lib/api';
import { formatRelativeTime } from '@/lib/risk';
import { X, Bell, AlertTriangle, ShieldAlert, Info, CheckCircle2 } from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({ isOpen, onClose }) => {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(20),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col focus:outline-hidden"
        role="dialog"
        aria-labelledby="notif-drawer-title"
      >
        {/* Drawer Header */}
        <div className="p-4 bg-[#101820] text-white flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#B79A62]" />
            <h2 id="notif-drawer-title" className="font-bold text-sm text-white">
              Official Alerts & Notifications
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {isLoading ? (
            <div className="text-center py-12 text-xs text-gray-500">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              No active flood alerts or road closures reported at this time.
            </div>
          ) : (
            notifications.map((item) => {
              const isWarning = item.severity === 'warning' || item.severity === 'severe';
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-lg border text-xs bg-white shadow-xs transition-all ${
                    isWarning ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] ${
                        isWarning ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span className="text-gray-400 text-[10px]">
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 text-xs mb-1">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.body}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-white border-t border-gray-200 text-center text-[11px] text-gray-500">
          Notifications are generated exclusively from verified official alerts and system updates.
        </div>
      </div>
    </div>
  );
};
