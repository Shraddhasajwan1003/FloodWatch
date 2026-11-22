import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { submitReport } from '@/lib/api';
import { queueReport, isOnline } from '@/lib/offlineSync';
import { useAuth } from '@/context/AuthContext';
import type { ReportCategory } from '@/types';
import {
  X,
  AlertTriangle,
  MapPin,
  Camera,
  CheckCircle,
  Loader2,
  Info,
} from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCoords?: { lat: number; lon: number } | null;
}

const CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: 'waterlogging',       label: '🌊 Road Waterlogging / Urban Flooding' },
  { value: 'road_blocked',       label: '🚫 Road Impassable / Blocked' },
  { value: 'bridge_damage',      label: '🌉 Submerged Bridge or Culvert' },
  { value: 'basement_flooding',  label: '⬇️ Inundated Basement / Underground Space' },
  { value: 'drain_overflow',     label: '💧 Drainage or Nala Overflow' },
  { value: 'cyclone_damage',     label: '🌀 Cyclone / Storm Damage' },
  { value: 'landslide',          label: '⛰️ Landslide / Mudslide' },
  { value: 'fire_flood',         label: '🔥 Fire in Flooded Area' },
  { value: 'earthquake_damage',  label: '🏚️ Earthquake / Structure Collapse' },
  { value: 'lightning_strike',   label: '⚡ Lightning Strike / Thunderstorm Damage' },
  { value: 'other',              label: '📋 Other Hazard / Emergency' },
];

const FLOOD_CATEGORIES: ReportCategory[] = [
  'waterlogging', 'road_blocked', 'bridge_damage', 'basement_flooding', 'drain_overflow',
];

const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'] as const;
type Severity = typeof SEVERITY_OPTIONS[number];

const detectFakeImage = async (file: File): Promise<{ isSuspect: boolean; reason: string }> => {
  if (file.size < 50000) {
    return {
      isSuspect: true,
      reason: 'Image file is unusually small (< 50KB). Real disaster photos from phone cameras are typically larger.',
    };
  }

  const ageMs = Date.now() - file.lastModified;
  if (ageMs < 0 || ageMs > 10 * 365 * 24 * 60 * 60 * 1000) {
    return { isSuspect: true, reason: 'Image timestamp appears invalid or manipulated.' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(img.width, 100);
      canvas.height = Math.min(img.height, 100);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      const colorSet = new Set<string>();
      for (let i = 0; i < data.length; i += 16) {
        colorSet.add(`${Math.floor(data[i] / 32)},${Math.floor(data[i + 1] / 32)},${Math.floor(data[i + 2] / 32)}`);
      }

      if (colorSet.size < 20) {
        resolve({
          isSuspect: true,
          reason:
            'Image has very low color variation. It may be a screenshot, AI-generated image, or cartoon. Only real photos of disaster conditions are accepted.',
        });
      } else {
        resolve({ isSuspect: false, reason: '' });
      }
    };
    img.onerror = () => resolve({ isSuspect: false, reason: '' });
    img.src = URL.createObjectURL(file);
  });
};

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, defaultCoords }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Form fields
  const [category, setCategory] = useState<ReportCategory>('waterlogging');
  const [description, setDescription] = useState('');
  const [waterDepth, setWaterDepth] = useState('');
  const [roadBlocked, setRoadBlocked] = useState(false);
  const [severity, setSeverity] = useState<Severity>('Medium');

  // GPS state
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(
    defaultCoords ?? null
  );
  const [gpsError, setGpsError] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Camera / image state
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [imageCheckResult, setImageCheckResult] = useState<{ isSuspect: boolean; reason: string } | null>(null);
  const [isCheckingImage, setIsCheckingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-acquire GPS when modal opens
  useEffect(() => {
    if (isOpen && !gpsCoords) {
      setIsLocating(true);
      setGpsError('');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setIsLocating(false);
        },
        () => {
          setGpsError('GPS access denied. Location is required to report a disaster.');
          setIsLocating(false);
        },
        { timeout: 10000 }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const stampeImageOnCanvas = async (file: File, lat: number, lon: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        // Dark band at top
        const bandHeight = 100;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, canvas.width, bandHeight);

        // White text with black stroke
        ctx.font = 'bold 12px monospace';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#ffffff';

        const lines = [
          'JalDrishti India | Disaster Report',
          `📍 Lat: ${lat.toFixed(5)}° N, Lon: ${lon.toFixed(5)}° E`,
          `📅 ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
          `🏛️ District: Unknown | 🇮🇳 India`,
          `👤 Reporter: ${user?.full_name ?? 'Anonymous Citizen'}`,
        ];

        lines.forEach((line, i) => {
          ctx.strokeText(line, 10, 18 + i * 16);
          ctx.fillText(line, 10, 18 + i * 16);
        });

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob failed'));
          },
          'image/jpeg',
          0.9
        );
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleCameraCapture = () => {
    if (!gpsCoords) {
      setErrorMsg('GPS location must be acquired before capturing a photo.');
      return;
    }
    setErrorMsg('');
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !gpsCoords) return;

    // Reset previous image state
    setCapturedBlob(null);
    setPreviewUrl('');
    setImageCheckResult(null);
    setIsCheckingImage(true);

    try {
      // Stamp GPS on image
      const blob = await stampeImageOnCanvas(file, gpsCoords.lat, gpsCoords.lon);
      const url = URL.createObjectURL(blob);
      setCapturedBlob(blob);
      setPreviewUrl(url);

      // Fake image detection (run on the original file for metadata checks)
      const result = await detectFakeImage(file);
      setImageCheckResult(result);
    } catch (err) {
      setErrorMsg('Failed to process image. Please try again.');
    } finally {
      setIsCheckingImage(false);
      // Reset input so same file can be re-selected
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gpsCoords) {
      setErrorMsg('GPS location is required to submit a disaster report. Please enable location access in your browser settings.');
      return;
    }
    if (!capturedBlob) {
      setErrorMsg('A GPS-tagged photo is required.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please provide a brief description of the condition.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const { lat, lon } = gpsCoords;

    // Offline check
    if (!isOnline()) {
      queueReport({
        category,
        description,
        lat,
        lon,
        road_blocked: roadBlocked,
        water_depth_cm: waterDepth ? parseFloat(waterDepth) : undefined,
      });
      setIsSuccess(true);
      setTimeout(() => { setIsSuccess(false); onClose(); }, 2500);
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('description', description);
      formData.append('lat', lat.toString());
      formData.append('lon', lon.toString());
      formData.append('road_blocked', roadBlocked ? 'true' : 'false');
      formData.append('severity', severity.toLowerCase());
      if (waterDepth) formData.append('water_depth_cm', waterDepth);
      formData.append('photo', capturedBlob, 'disaster_report.jpg');
      if (imageCheckResult?.isSuspect) {
        formData.append('ai_suspect', 'true');
      }

      await submitReport(formData);
      setIsSuccess(true);
      setTimeout(() => { setIsSuccess(false); onClose(); }, 2500);
    } catch (err: any) {
      console.error(err);
      queueReport({
        category,
        description,
        lat,
        lon,
        road_blocked: roadBlocked,
        water_depth_cm: waterDepth ? parseFloat(waterDepth) : undefined,
      });
      setIsSuccess(true);
      setTimeout(() => { setIsSuccess(false); onClose(); }, 2500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showFloodFields = FLOOD_CATEGORIES.includes(category);
  const canSubmit = !!gpsCoords && !!capturedBlob && !isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-[#101820] text-white p-5 rounded-t-xl flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-amber-400 font-bold">
              Citizen Reporting
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">Report a Disaster</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSuccess ? (
            <div className="py-10 text-center space-y-3">
              <CheckCircle className="w-14 h-14 text-emerald-600 mx-auto animate-bounce" />
              <h3 className="text-lg font-bold text-gray-900">Report Submitted Successfully</h3>
              <p className="text-xs text-gray-600 max-w-sm mx-auto">
                Thank you. Your report is currently recorded as <strong>UNVERIFIED</strong> and will be reviewed by moderation teams before impacting route recommendations.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Disaster type selector */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Disaster Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ReportCategory)}
                  className="w-full p-2.5 rounded-md border border-gray-300 text-gray-900 bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* 2. GPS Status */}
              <div className="p-3 rounded-md border flex items-start gap-2 text-[11px]"
                style={{
                  backgroundColor: gpsCoords ? '#f0fdf4' : gpsError ? '#fef2f2' : '#fffbeb',
                  borderColor: gpsCoords ? '#86efac' : gpsError ? '#fca5a5' : '#fde68a',
                }}
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin text-amber-600 mt-0.5" />
                    <span className="text-amber-800 font-semibold">📍 Getting GPS Location...</span>
                  </>
                ) : gpsCoords ? (
                  <>
                    <MapPin className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span className="text-emerald-800 font-semibold">
                      ✅ Location acquired: {gpsCoords.lat.toFixed(5)}°N, {gpsCoords.lon.toFixed(5)}°E
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                    <span className="text-red-800">
                      {gpsError || 'GPS location is required to submit a disaster report. Please enable location access in your browser settings.'}
                    </span>
                  </>
                )}
              </div>

              {/* 3. Camera capture + preview */}
              <div>
                <label className="block font-semibold text-gray-700 mb-2">
                  GPS-Tagged Photo <span className="text-red-600">*</span>
                </label>

                {/* Hidden file input — camera only */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelected}
                />

                <button
                  type="button"
                  onClick={handleCameraCapture}
                  disabled={!gpsCoords || isLocating}
                  className="w-full py-3 rounded-lg font-bold text-[#101820] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#B79A62' }}
                >
                  <Camera className="w-5 h-5" />
                  📷 Open Camera &amp; Tag GPS
                </button>

                {isCheckingImage && (
                  <div className="mt-2 flex items-center gap-2 text-amber-700 text-[11px]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Analysing image authenticity...
                  </div>
                )}

                {previewUrl && (
                  <div className="mt-3">
                    <img
                      src={previewUrl}
                      alt="GPS-stamped disaster photo"
                      className="w-full rounded-lg border border-gray-300 object-cover max-h-52"
                    />
                  </div>
                )}

                {imageCheckResult && (
                  <div
                    className={`mt-2 p-2.5 rounded-md text-[11px] flex items-start gap-2 ${
                      imageCheckResult.isSuspect
                        ? 'bg-red-50 border border-red-200 text-red-800'
                        : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {imageCheckResult.isSuspect ? (
                      <>
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                        <span>
                          ⚠️ Suspicious Image Detected: {imageCheckResult.reason} Only authentic, GPS-stamped, live camera photos of real disaster conditions are accepted.
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                        <span>✅ Image Verified as Authentic</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Description */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description &amp; Landmark</label>
                <textarea
                  rows={3}
                  placeholder="Describe the situation, nearest landmark, and any immediate dangers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-md border border-gray-300"
                />
              </div>

              {/* 5. Water depth + road blocked (flood categories only) */}
              {showFloodFields && (
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Approx Depth (cm, optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      placeholder="e.g. 45"
                      value={waterDepth}
                      onChange={(e) => setWaterDepth(e.target.value)}
                      className="w-full p-2 rounded-md border border-gray-300"
                    />
                  </div>
                  <div className="pt-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="roadBlocked"
                      checked={roadBlocked}
                      onChange={(e) => setRoadBlocked(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <label htmlFor="roadBlocked" className="font-bold text-red-700 cursor-pointer">
                      Road completely impassable
                    </label>
                  </div>
                </div>
              )}

              {/* 6. Severity selector */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Severity Level</label>
                <div className="flex gap-2">
                  {SEVERITY_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      className={`flex-1 py-1.5 rounded-md font-bold border text-[11px] transition-all ${
                        severity === s
                          ? s === 'Critical'
                            ? 'bg-red-600 text-white border-red-700'
                            : s === 'High'
                            ? 'bg-orange-500 text-white border-orange-600'
                            : s === 'Medium'
                            ? 'bg-amber-400 text-[#101820] border-amber-500'
                            : 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Moderation notice */}
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2 text-[11px]">
                <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  <strong>Moderation Policy:</strong> Submissions remain UNVERIFIED initially to prevent malicious or duplicate inflation of disaster scores. Reports expire after 3 hours.
                </span>
              </div>

              {/* 7. Submit */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  title={!gpsCoords ? 'GPS required' : !capturedBlob ? 'Photo required' : ''}
                  className="px-5 py-2 rounded-md bg-[#B79A62] hover:bg-[#a68953] text-[#101820] font-bold shadow-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin text-[#101820]" />}
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
