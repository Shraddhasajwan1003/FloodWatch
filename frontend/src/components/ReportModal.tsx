import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submitReport } from '@/lib/api';
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

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  defaultCoords,
}) => {
  const { t } = useTranslation();
  const [category, setCategory] = useState<ReportCategory>('waterlogging');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState<string>(defaultCoords ? defaultCoords.lat.toFixed(5) : '28.6139');
  const [lon, setLon] = useState<string>(defaultCoords ? defaultCoords.lon.toFixed(5) : '77.2090');
  const [waterDepth, setWaterDepth] = useState<string>('');
  const [roadBlocked, setRoadBlocked] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Please provide a brief description of the condition.');
      return;
    }
    const pLat = parseFloat(lat);
    const pLon = parseFloat(lon);
    if (isNaN(pLat) || isNaN(pLon)) {
      setErrorMsg('Please specify valid latitude and longitude coordinates.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('description', description);
      formData.append('lat', pLat.toString());
      formData.append('lon', pLon.toString());
      formData.append('road_blocked', roadBlocked ? 'true' : 'false');
      if (waterDepth) {
        formData.append('water_depth_cm', waterDepth);
      }
      if (photo) {
        formData.append('photo', photo);
      }

      await submitReport(formData);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.response?.data?.detail || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude.toFixed(5));
          setLon(pos.coords.longitude.toFixed(5));
        },
        () => alert('Could not access current location.')
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[#101820] text-white p-5 rounded-t-xl flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-amber-400 font-bold">
              Citizen Reporting
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">Report Waterlogging or Blocked Road</h2>
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

              {/* Category */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Incident Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ReportCategory)}
                  className="w-full p-2.5 rounded-md border border-gray-300 text-gray-900 bg-white"
                >
                  <option value="waterlogging">Road Waterlogging (Passable with care)</option>
                  <option value="road_blocked">Road Impassable / Blocked</option>
                  <option value="bridge_damage">Submerged Bridge or Culvert</option>
                  <option value="basement_flooding">Inundated Basement / Underground</option>
                  <option value="drain_overflow">Drainage or Nala Overflow</option>
                  <option value="other">Other Flood Hazard</option>
                </select>
              </div>

              {/* Coordinates */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-gray-700">Location Coordinates (Lat / Lon)</label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="text-[#B79A62] hover:underline font-bold flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>My Location</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Latitude"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    required
                    className="p-2.5 rounded-md border border-gray-300"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Longitude"
                    value={lon}
                    onChange={(e) => setLon(e.target.value)}
                    required
                    className="p-2.5 rounded-md border border-gray-300"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description & Landmark</label>
                <textarea
                  rows={3}
                  placeholder="Describe location, nearest landmark, and severity (e.g. Underpass submerged near railway station)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-md border border-gray-300"
                />
              </div>

              {/* Water Depth & Road Blocked checkbox */}
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
                    Road is completely impassable
                  </label>
                </div>
              </div>

              {/* Optional Photo Upload */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Photograph (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
              </div>

              {/* Notice */}
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2 text-[11px]">
                <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  <strong>Moderation Policy:</strong> Submissions remain UNVERIFIED initially to prevent malicious or duplicate inflation of flood scores. Reports expire after 3 hours.
                </span>
              </div>

              {/* Buttons */}
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
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-md bg-[#B79A62] hover:bg-[#a68953] text-[#101820] font-bold shadow-xs flex items-center gap-2 disabled:opacity-50"
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
