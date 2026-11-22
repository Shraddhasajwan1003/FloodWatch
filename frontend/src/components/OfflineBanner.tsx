import React, { useState, useEffect } from 'react';
import { isOnline, syncOfflineData, getTotalQueuedCount } from '@/lib/offlineSync';
import { WifiOff, Wifi, RefreshCw, CheckCircle2 } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState<boolean>(true);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [justSynced, setJustSynced] = useState<boolean>(false);

  useEffect(() => {
    setOnline(isOnline());
    setQueuedCount(getTotalQueuedCount());

    const handleOnline = async () => {
      setOnline(true);
      const count = getTotalQueuedCount();
      if (count > 0) {
        setSyncing(true);
        try {
          const res = await syncOfflineData();
          if (res.syncedRescues > 0 || res.syncedReports > 0) {
            setJustSynced(true);
            setTimeout(() => setJustSynced(false), 5000);
          }
        } finally {
          setSyncing(false);
          setQueuedCount(getTotalQueuedCount());
        }
      }
    };

    const handleOffline = () => {
      setOnline(false);
      setQueuedCount(getTotalQueuedCount());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setQueuedCount(getTotalQueuedCount());
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await syncOfflineData();
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 4000);
    } finally {
      setSyncing(false);
      setQueuedCount(getTotalQueuedCount());
    }
  };

  if (online && queuedCount === 0 && !justSynced) {
    return null;
  }

  return (
    <div className={`w-full py-2 px-4 text-xs font-semibold flex items-center justify-between transition-colors ${
      !online
        ? 'bg-amber-600 text-white'
        : justSynced
        ? 'bg-emerald-600 text-white'
        : 'bg-blue-600 text-white'
    }`}>
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!online ? (
            <>
              <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
              <span>Offline Mode Active. Reports and Distress SOS are cached locally and will auto-sync when network returns.</span>
            </>
          ) : justSynced ? (
            <>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Connection restored! All offline SOS and flood reports synced successfully.</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4 shrink-0" />
              <span>Back Online. {queuedCount} offline report(s) ready to synchronize.</span>
            </>
          )}
        </div>

        {queuedCount > 0 && online && (
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : `Sync Now (${queuedCount})`}</span>
          </button>
        )}
      </div>
    </div>
  );
};
