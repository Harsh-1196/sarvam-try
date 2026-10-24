import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Sparkles, FileWarning, Globe, RefreshCw, X, Check, Aperture, SwitchCamera } from 'lucide-react';
import { LANGUAGES } from '../lib/languages';

interface UploadScreenProps {
  onUpload: (file: File, languageHint?: string) => void;
  isLoading: boolean;
  initialFile?: File | null;
}

export function UploadScreen({ onUpload, isLoading, initialFile = null }: UploadScreenProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile);
  const [previewUrl, setPreviewUrl] = useState<string | null>(() =>
    initialFile ? URL.createObjectURL(initialFile) : null
  );
  const [languageHint, setLanguageHint] = useState<string>('auto');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Camera Modal State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (capturedPhotoUrl) URL.revokeObjectURL(capturedPhotoUrl);
    };
  }, [previewUrl, capturedPhotoUrl]);

  const validateFile = (file: File): boolean => {
    setValidationError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setValidationError('Please upload a valid JPEG, PNG, or WebP newspaper image.');
      return false;
    }
    const maxBytes = 15 * 1024 * 1024; // 15MB
    if (file.size > maxBytes) {
      setValidationError('File size exceeds 15 MB. Please select a smaller photo.');
      return false;
    }
    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  // Camera Management
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    setCapturedPhotoUrl(null);
    setCapturedBlob(null);

    // Stop any existing tracks
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Camera access failed:', err);
      // Fallback try without specific facingMode
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (fallbackErr: any) {
        setCameraError('Unable to access camera. Please check permissions or upload a saved photo.');
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCapturedPhotoUrl(null);
    setCapturedBlob(null);
  };

  const openCameraModal = () => {
    setIsCameraOpen(true);
    startCamera(facingMode);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedBlob(blob);
          setCapturedPhotoUrl(url);
        }
      },
      'image/jpeg',
      0.95
    );
  };

  const confirmCapturedPhoto = () => {
    if (!capturedBlob) return;
    const photoFile = new File([capturedBlob], `newspaper-snap-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });
    handleFile(photoFile);
    stopCamera();
  };

  const retakeSnapshot = () => {
    setCapturedPhotoUrl(null);
    setCapturedBlob(null);
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    onUpload(selectedFile, languageHint);
  };

  return (
    <div className="max-w-3xl mx-auto w-full animate-in fade-in duration-300">
      {/* Hidden Mobile Native Camera Input */}
      <input
        ref={mobileCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {/* Hidden Standard File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {/* Hero Intro */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] text-xs font-semibold text-[#AF695C] mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#AF695C]" />
          <span>Physical Print to Evidence-Linked Intelligence</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] dark:text-[#F9F4ED] tracking-tight">
          Photograph or Upload Indian Newspaper
        </h2>
        <p className="text-sm sm:text-base text-[#77716D] mt-2 max-w-xl mx-auto">
          Scan any article across 23 languages. We detect the publication date, cross-verify web coverage via Tavily, and synthesize a verified story with voice Q&amp;A.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Action Buttons (Camera vs Browse) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={openCameraModal}
            className="p-5 rounded-[24px] bg-[#EDEAEA] dark:bg-[#282523] hover:border-[#AF695C] flex items-center space-x-4 text-left group border border-[#D8D0C8] dark:border-[#3E3835] transition-all"
          >
            <div className="w-13 h-13 rounded-2xl bg-[#AF695C] text-[#F9F4ED] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <span className="font-semibold text-base text-[#2A2A2A] dark:text-[#F9F4ED] flex items-center space-x-1.5">
                <span>Take Live Photo</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#AF695C]/15 text-[#AF695C]">
                  Instant
                </span>
              </span>
              <p className="text-xs text-[#77716D] mt-0.5">
                Open camera viewfinder to snap your print clipping
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-5 rounded-[24px] bg-[#EDEAEA] dark:bg-[#282523] hover:border-[#AF695C] flex items-center space-x-4 text-left group border border-[#D8D0C8] dark:border-[#3E3835] transition-all"
          >
            <div className="w-13 h-13 rounded-2xl bg-[#EDEAEA] dark:bg-[#1F1D1B] border border-[#D8D0C8] dark:border-[#3E3835] text-[#AF695C] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <span className="font-semibold text-base text-[#2A2A2A] dark:text-[#F9F4ED]">
                Browse Files
              </span>
              <p className="text-xs text-[#77716D] mt-0.5">
                Upload JPEG, PNG, or WebP scan from device
              </p>
            </div>
          </button>
        </div>

        {/* Dropzone / Preview Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-[28px] border-2 border-dashed p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 ${
            dragActive
              ? 'border-[#AF695C] bg-[#AF695C]/5 scale-[1.01]'
              : selectedFile
              ? 'border-[#AF695C] bg-[#F9F4ED] shadow-sm'
              : 'border-[#D8D0C8] dark:border-[#3E3835] bg-[#EDEAEA]/50 dark:bg-[#282523]/50 hover:border-[#AF695C] shadow-sm'
          }`}
        >
          {previewUrl ? (
            <div className="space-y-4">
              <div className="relative inline-block max-h-72 rounded-2xl overflow-hidden shadow-md border border-[#D8D0C8] dark:border-[#3E3835] bg-[#EDEAEA]">
                <img
                  src={previewUrl}
                  alt="Newspaper preview"
                  className="max-h-72 w-auto object-contain mx-auto"
                />
                <div className="absolute top-3 right-3 bg-[#2A2A2A]/85 backdrop-blur-md text-[#F9F4ED] text-[11px] font-mono px-2.5 py-1 rounded-full flex items-center space-x-1 border border-white/10">
                  <Check className="w-3.5 h-3.5 text-[#AF695C]" />
                  <span>Ready for OCR</span>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 text-xs text-[#77716D]">
                <span className="font-semibold text-[#2A2A2A] dark:text-[#F9F4ED]">{selectedFile?.name}</span>
                <span>•</span>
                <span className="font-mono">{selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : 0} MB</span>
              </div>
              <p className="text-xs text-[#AF695C] font-medium">
                Click or drag another clipping to replace
              </p>
            </div>
          ) : (
            <div className="py-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#EDEAEA] dark:bg-[#1F1D1B] border border-[#D8D0C8] dark:border-[#3E3835] flex items-center justify-center mx-auto text-[#AF695C]">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-base sm:text-lg text-[#2A2A2A] dark:text-[#F9F4ED]">
                  Or drag and drop your newspaper clipping here
                </p>
                <p className="text-xs sm:text-sm text-[#77716D] mt-1">
                  High-contrast photo with headlines and text clearly visible
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-3.5 rounded-2xl bg-[#AF695C]/10 border border-[#AF695C]/30 text-[#AF695C] text-xs flex items-center space-x-2.5 shadow-sm">
            <FileWarning className="w-4 h-4 flex-shrink-0 text-[#AF695C]" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Language Hint Selection */}
        <div className="p-5 rounded-[24px] bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#AF695C]/10 border border-[#AF695C]/20 flex items-center justify-center text-[#AF695C] flex-shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <label htmlFor="language-hint" className="text-xs font-bold uppercase tracking-wider text-[#2A2A2A] dark:text-[#F9F4ED] block">
                Language Hint (Optional)
              </label>
              <p className="text-xs text-[#77716D]">
                Auto-detects across 23 languages or select to guide Sarvam Vision
              </p>
            </div>
          </div>

          <select
            id="language-hint"
            value={languageHint}
            onChange={(e) => setLanguageHint(e.target.value)}
            className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#F9F4ED] dark:bg-[#1F1D1B] border border-[#D8D0C8] dark:border-[#3E3835] text-[#2A2A2A] dark:text-[#F9F4ED] focus:outline-none focus:ring-2 focus:ring-[#AF695C] shadow-sm"
          >
            <option value="auto">Auto Detect (All 23 Languages)</option>
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.nativeName})
              </option>
            ))}
          </select>
        </div>

        {/* Primary Submit Action */}
        <button
          type="submit"
          disabled={!selectedFile || isLoading}
          className="w-full py-4.5 px-6 rounded-2xl font-bold text-sm sm:text-base text-[#F9F4ED] bg-[#AF695C] hover:bg-[#99594D] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center space-x-2.5 cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-[#F9F4ED]" />
          <span>{isLoading ? 'Scanning Newspaper Scan...' : 'Digitize & Discover Coverage →'}</span>
        </button>
      </form>

      {/* Live Camera Viewfinder Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-3xl bg-slate-950 border border-white/10 overflow-hidden shadow-2xl flex flex-col">
            {/* Viewfinder Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/10 text-white">
              <div className="flex items-center space-x-2">
                <Aperture className="w-5 h-5 text-rose-500 animate-spin" />
                <span className="font-semibold text-sm">Newspaper Viewfinder</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                  title="Switch camera"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Viewfinder Body / Live Video */}
            <div className="relative bg-black aspect-[4/3] flex items-center justify-center overflow-hidden">
              {capturedPhotoUrl ? (
                <img
                  src={capturedPhotoUrl}
                  alt="Captured snapshot"
                  className="w-full h-full object-contain"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Framing Overlay Grid */}
                  <div className="absolute inset-6 border-2 border-dashed border-white/40 rounded-2xl pointer-events-none flex flex-col justify-between p-4">
                    <span className="text-[11px] text-white/80 bg-black/40 backdrop-blur px-2 py-0.5 rounded w-max">
                      Frame article headline &amp; date inside lines
                    </span>
                  </div>
                </>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                  <FileWarning className="w-10 h-10 text-amber-400" />
                  <p className="text-sm">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => mobileCameraInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-[#AF695C] text-xs font-semibold text-[#F9F4ED]"
                  >
                    Use Device Camera App
                  </button>
                </div>
              )}
            </div>

            {/* Viewfinder Controls Footer */}
            <div className="p-4 bg-stone-900 border-t border-white/10 flex items-center justify-around">
              {capturedPhotoUrl ? (
                <>
                  <button
                    type="button"
                    onClick={retakeSnapshot}
                    className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retake</span>
                  </button>
                  <button
                    type="button"
                    onClick={confirmCapturedPhoto}
                    className="flex items-center space-x-1.5 px-6 py-2.5 rounded-2xl text-xs font-bold text-[#F9F4ED] bg-[#AF695C] hover:bg-[#99594D] shadow-md transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>Use This Photo</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <button
                    type="button"
                    onClick={takeSnapshot}
                    className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 bg-white/20 hover:bg-white/30 active:scale-95 transition-transform"
                    aria-label="Capture photograph"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#AF695C] shadow-md"></div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
