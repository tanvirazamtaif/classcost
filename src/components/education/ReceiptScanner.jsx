import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Image, Zap, RotateCcw, Check, Loader2, FlashlightOff, Flashlight } from 'lucide-react';
import { haptics } from '../../lib/haptics';

// Only show on mobile/tablet
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.innerWidth <= 768 && 'ontouchstart' in window);
};

// Extract amounts from OCR text with strong pattern matching
function extractAmounts(text, words) {
  const results = [];
  const seen = new Set();

  // Priority 1: Amounts with currency symbols or keywords nearby
  const currencyPatterns = [
    /(?:৳|BDT|Tk\.?|Taka)\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:৳|BDT|Tk\.?|Taka)/gi,
  ];

  for (const pattern of currencyPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const numStr = (match[1] || match[0]).replace(/[৳BDTTktakaA.\s]/gi, '').replace(/,/g, '');
      const num = Number(numStr);
      if (num > 0 && num < 50000000 && !seen.has(num)) {
        seen.add(num);
        results.push({ amount: num, confidence: 0.95, label: 'Currency match' });
      }
    }
  }

  // Priority 2: Amounts near fee-related keywords
  const feeKeywords = [
    'total', 'grand total', 'amount', 'payable', 'due', 'net',
    'tuition', 'semester', 'credit', 'fee', 'fees',
    'admission', 'registration', 'library', 'lab', 'development',
    'waiver', 'discount', 'scholarship',
    'per credit', 'rate', 'cost',
  ];

  const lines = text.split('\n');
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    const hasKeyword = feeKeywords.some(kw => lowerLine.includes(kw));
    if (!hasKeyword) continue;

    const numMatches = line.match(/[\d,]+(?:\.\d{1,2})?/g);
    if (!numMatches) continue;

    for (const numStr of numMatches) {
      const num = Number(numStr.replace(/,/g, ''));
      if (num >= 50 && num < 50000000 && !seen.has(num)) {
        seen.add(num);
        const isTotalLine = /total|payable|due|net|grand/i.test(lowerLine);
        results.push({
          amount: num,
          confidence: isTotalLine ? 0.9 : 0.7,
          label: feeKeywords.find(kw => lowerLine.includes(kw)) || 'Fee amount',
        });
      }
    }
  }

  // Priority 3: Standalone large numbers (likely amounts)
  const allNumbers = text.match(/\b[\d,]{3,}(?:\.\d{1,2})?\b/g) || [];
  for (const numStr of allNumbers) {
    const num = Number(numStr.replace(/,/g, ''));
    if (num >= 500 && num < 50000000 && !seen.has(num)) {
      seen.add(num);
      results.push({ amount: num, confidence: 0.4, label: 'Detected number' });
    }
  }

  // Sort by confidence then by amount (descending)
  return results.sort((a, b) => b.confidence - a.confidence || b.amount - a.amount);
}

// Get word bounding boxes from Tesseract for overlay
function getAmountBoxes(words, amounts) {
  const boxes = [];
  const amountSet = new Set(amounts.map(a => a.amount));

  for (const word of words) {
    const cleanNum = Number(word.text.replace(/[৳,BDTTk.\s]/gi, ''));
    if (amountSet.has(cleanNum)) {
      boxes.push({
        amount: cleanNum,
        bbox: word.bbox,
        text: word.text,
      });
    }
  }
  return boxes;
}

export const ReceiptScanner = ({ isOpen, onClose, onAmountSelect, onCreditDetect }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [phase, setPhase] = useState('camera'); // camera | processing | results
  const [capturedImage, setCapturedImage] = useState(null);
  const [detectedAmounts, setDetectedAmounts] = useState([]);
  const [amountBoxes, setAmountBoxes] = useState([]);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [progress, setProgress] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 });

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      // Fall back to file picker
      fileInputRef.current?.click();
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPhase('camera');
      setCapturedImage(null);
      setDetectedAmounts([]);
      setSelectedAmount(null);
      setProgress(0);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  // Toggle flash
  const toggleFlash = async () => {
    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !flashOn }] });
      setFlashOn(!flashOn);
    } catch {}
  };

  // Capture from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    haptics.medium();

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    setImgDimensions({ w: video.videoWidth, h: video.videoHeight });
    stopCamera();
    processImage(dataUrl);
  };

  // Handle file upload (gallery)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setCapturedImage(dataUrl);
      stopCamera();

      // Get image dimensions
      const img = new window.Image();
      img.onload = () => {
        setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight });
        processImage(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Process image with OCR
  const processImage = async (imageData) => {
    setPhase('processing');
    setProgress(10);
    haptics.light();

    try {
      setProgress(20);
      const { createWorker } = await import('tesseract.js');
      setProgress(35);

      const worker = await createWorker('eng+ben', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(35 + Math.round(m.progress * 55));
          }
        },
      });

      setProgress(40);
      const { data } = await worker.recognize(imageData);
      setProgress(95);
      await worker.terminate();

      const amounts = extractAmounts(data.text, data.words);
      const boxes = getAmountBoxes(data.words, amounts);

      setDetectedAmounts(amounts);
      setAmountBoxes(boxes);
      setProgress(100);

      if (amounts.length > 0) {
        setSelectedAmount(amounts[0].amount);
        haptics.success();
      } else {
        haptics.error();
      }

      setTimeout(() => setPhase('results'), 300);
    } catch (err) {
      console.error('OCR error:', err);
      haptics.error();
      setPhase('results');
      setDetectedAmounts([]);
    }
  };

  // Confirm selection
  const handleConfirm = () => {
    if (selectedAmount) {
      haptics.success();

      // Check if we also detected a credit rate
      if (onCreditDetect && detectedAmounts.length >= 2) {
        const sorted = [...new Set(detectedAmounts.map(a => a.amount))].sort((a, b) => a - b);
        const hasRateKeyword = detectedAmounts.some(a => a.label.includes('credit') || a.label.includes('rate'));
        if (hasRateKeyword && sorted.length >= 2) {
          onCreditDetect({
            rate: sorted[0],
            total: sorted[sorted.length - 1],
            credits: Math.round(sorted[sorted.length - 1] / sorted[0]),
          });
        }
      }

      onAmountSelect(selectedAmount);
    }
    onClose();
  };

  // Retry
  const handleRetry = () => {
    setCapturedImage(null);
    setDetectedAmounts([]);
    setSelectedAmount(null);
    setAmountBoxes([]);
    setProgress(0);
    setPhase('camera');
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col"
      >
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        <canvas ref={canvasRef} className="hidden" />

        {/* ═══ CAMERA PHASE ═══ */}
        {phase === 'camera' && (
          <>
            {/* Camera viewfinder */}
            <div className="flex-1 relative overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Scan frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Corner markers */}
                <div className="w-[85%] max-w-sm aspect-[3/4] relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-white rounded-br-lg" />

                  {/* Scanning line animation */}
                  <motion.div
                    animate={{ y: ['0%', '100%', '0%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-60"
                  />
                </div>
              </div>

              {/* Hint text */}
              <div className="absolute top-0 left-0 right-0 pt-16 pb-4 px-6 bg-gradient-to-b from-black/60 to-transparent">
                <p className="text-white text-center text-sm font-medium">
                  Point at fee receipt or invoice
                </p>
                <p className="text-white/60 text-center text-xs mt-1">
                  Make sure the amount is clearly visible
                </p>
              </div>
            </div>

            {/* Bottom controls */}
            <div className="bg-black px-6 pb-8 pt-4">
              <div className="flex items-center justify-between max-w-sm mx-auto">
                {/* Gallery */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <Image className="w-5 h-5 text-white" />
                </motion.button>

                {/* Capture button (Google Lens style) */}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={capturePhoto}
                  className="relative"
                >
                  <div className="w-[72px] h-[72px] rounded-full border-4 border-white flex items-center justify-center">
                    <div className="w-[58px] h-[58px] rounded-full bg-white" />
                  </div>
                </motion.button>

                {/* Flash toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleFlash}
                  className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"
                >
                  {flashOn ? (
                    <Flashlight className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <FlashlightOff className="w-5 h-5 text-white/60" />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-12 left-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </>
        )}

        {/* ═══ PROCESSING PHASE ═══ */}
        {phase === 'processing' && (
          <div className="flex-1 flex flex-col">
            {/* Image preview with processing overlay */}
            <div className="flex-1 relative">
              {capturedImage && (
                <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-contain bg-black" />
              )}

              {/* Processing overlay */}
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 rounded-full border-4 border-white/20 border-t-primary-500 mb-6"
                />
                <p className="text-white font-medium text-lg">Scanning receipt...</p>
                <p className="text-white/60 text-sm mt-1">Finding amounts</p>

                {/* Progress bar */}
                <div className="w-48 h-1.5 bg-white/20 rounded-full mt-4 overflow-hidden">
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-primary-500 rounded-full"
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-white/40 text-xs mt-2">{progress}%</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ RESULTS PHASE ═══ */}
        {phase === 'results' && (
          <div className="flex-1 flex flex-col">
            {/* Image with amount highlights */}
            <div className="flex-1 relative min-h-0">
              {capturedImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="relative inline-block max-w-full max-h-full">
                    <img
                      src={capturedImage}
                      alt="Scanned"
                      className="max-w-full max-h-[50vh] object-contain"
                    />

                    {/* Highlight boxes on detected amounts */}
                    {amountBoxes.map((box, i) => {
                      const isSelected = selectedAmount === box.amount;
                      const imgEl = document.querySelector('[alt="Scanned"]');
                      if (!imgEl || !imgDimensions.w) return null;

                      const scaleX = imgEl.clientWidth / imgDimensions.w;
                      const scaleY = imgEl.clientHeight / imgDimensions.h;

                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                          onClick={() => { haptics.light(); setSelectedAmount(box.amount); }}
                          className={`absolute cursor-pointer rounded-md border-2 transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-500/20 shadow-lg shadow-primary-500/30'
                              : 'border-emerald-400/60 bg-emerald-500/10'
                          }`}
                          style={{
                            left: box.bbox.x0 * scaleX - 4,
                            top: box.bbox.y0 * scaleY - 2,
                            width: (box.bbox.x1 - box.bbox.x0) * scaleX + 8,
                            height: (box.bbox.y1 - box.bbox.y0) * scaleY + 4,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center z-10"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Results panel (Google Lens style bottom sheet) */}
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="bg-surface-900 rounded-t-3xl px-5 pt-3 pb-8 max-h-[50vh] overflow-y-auto"
            >
              {/* Drag handle */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 bg-surface-700 rounded-full" />
              </div>

              {detectedAmounts.length === 0 ? (
                /* No results */
                <div className="text-center py-6">
                  <span className="text-4xl block mb-3">🔍</span>
                  <p className="text-white font-medium">No amounts detected</p>
                  <p className="text-surface-400 text-sm mt-1">Try a clearer photo with better lighting</p>
                  <div className="flex gap-3 mt-5">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleRetry}
                      className="flex-1 py-3 rounded-xl bg-surface-800 text-white font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Try Again
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="flex-1 py-3 rounded-xl bg-surface-800 text-surface-400 font-medium text-sm"
                    >
                      Enter Manually
                    </motion.button>
                  </div>
                </div>
              ) : (
                /* Amount results */
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-primary-500" />
                    <p className="text-sm font-medium text-surface-300">
                      {detectedAmounts.length} amount{detectedAmounts.length > 1 ? 's' : ''} found
                    </p>
                  </div>

                  <p className="text-xs text-surface-500 mb-3">Tap to select the correct amount</p>

                  <div className="space-y-2 mb-5">
                    {detectedAmounts.slice(0, 8).map((item, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { haptics.light(); setSelectedAmount(item.amount); }}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          selectedAmount === item.amount
                            ? 'bg-primary-600/20 border-primary-500 ring-1 ring-primary-500/30'
                            : 'bg-surface-800 border-surface-700 hover:border-surface-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            selectedAmount === item.amount ? 'bg-primary-600' : 'bg-surface-700'
                          }`}>
                            {selectedAmount === item.amount ? (
                              <Check className="w-4 h-4 text-white" />
                            ) : (
                              <span className="text-xs text-surface-400">{i + 1}</span>
                            )}
                          </div>
                          <div className="text-left">
                            <p className={`text-lg font-bold ${selectedAmount === item.amount ? 'text-primary-400' : 'text-white'}`}>
                              ৳{item.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-surface-500 capitalize">{item.label}</p>
                          </div>
                        </div>

                        {/* Confidence indicator */}
                        <div className="flex gap-0.5">
                          {[1, 2, 3].map(bar => (
                            <div
                              key={bar}
                              className={`w-1 rounded-full ${
                                item.confidence >= bar * 0.33
                                  ? item.confidence > 0.7 ? 'bg-emerald-500' : 'bg-amber-500'
                                  : 'bg-surface-700'
                              }`}
                              style={{ height: 8 + bar * 4 }}
                            />
                          ))}
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleRetry}
                      className="flex-1 py-3 rounded-xl bg-surface-800 text-white font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Rescan
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleConfirm}
                      disabled={!selectedAmount}
                      className={`flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 ${
                        selectedAmount
                          ? 'bg-primary-600 text-white'
                          : 'bg-surface-800 text-surface-600'
                      }`}
                    >
                      <Check className="w-4 h-4" /> Use ৳{(selectedAmount || 0).toLocaleString()}
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
