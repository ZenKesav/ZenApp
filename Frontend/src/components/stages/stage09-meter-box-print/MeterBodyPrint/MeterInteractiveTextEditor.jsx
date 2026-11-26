import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import meterBodyCADImg from '../../../../assets/images/meter-body.PNG';
import QRCodeSVG from '../../../common/QRCode/QRCodeSVG';
import BarcodeSVG from '../../../common/QRCode/BarcodeSVG';
import zenmeterLogoImg from '../../../../assets/images/zenmeter_logo.png';
import { stageManagementService } from '../../../../services/apiServices';
import ImageCropModal from './ImageCropModal';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const resolveBackendFileUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const envBackend = import.meta.env.VITE_BACKEND_URL;
  if (envBackend && url.startsWith('/')) {
    return `${envBackend.replace(/\/$/, '')}${url}`;
  }
  return url;
};

const MIN_BARCODE_WIDTH_MM = 40;
const MIN_BARCODE_HEIGHT_MM = 5.5;
const MM_TO_CANVAS_PX = 4; // 115mm meter enclosure front face maps to 460px reference canvas width

const renderPdfFirstPageToDataUrl = async (pdfSource) => {
  const loadingTask = pdfjsLib.getDocument(
    pdfSource instanceof ArrayBuffer ? { data: new Uint8Array(pdfSource) } : pdfSource
  );
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const targetMaxDim = 1200;
  const scale = Math.min(2.5, Math.max(1.2, targetMaxDim / Math.max(baseViewport.width, baseViewport.height)));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/png');
};

/**
 * Standard Utility / Discom Partner Logo Presets (SVG Data URIs)
 */
const PRESET_UTILITY_LOGOS = [
  {
    id: 'tatapower',
    name: 'Tata Power',
    icon: 'ti-bolt',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="140" height="36" viewBox="0 0 140 36"><circle cx="18" cy="18" r="15" fill="%230284c7"/><path d="M9 14 L27 14 M18 14 L18 27" stroke="%23ffffff" stroke-width="3" stroke-linecap="round"/><path d="M23 23 A6 6 0 0 0 26 18" stroke="%23f59e0b" stroke-width="2" fill="none"/><text x="38" y="19" font-family="Arial,sans-serif" font-weight="900" font-size="12" fill="%23ffffff" letter-spacing="0.5">TATA POWER</text><text x="38" y="28" font-family="Arial,sans-serif" font-weight="600" font-size="7" fill="%2394a3b8" letter-spacing="0.2">LIGHTING UP LIVES</text></svg>'
  },
  {
    id: 'bescom',
    name: 'BESCOM',
    icon: 'ti-current-location',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="130" height="36" viewBox="0 0 130 36"><circle cx="18" cy="18" r="15" fill="%231e3a8a" stroke="%23fbbf24" stroke-width="2"/><path d="M18 7 L11 18 L17 18 L14 29 L25 17 L19 17 Z" fill="%23fbbf24" stroke="%23ffffff" stroke-width="1"/><text x="38" y="19" font-family="Arial,sans-serif" font-weight="900" font-size="12" fill="%23ffffff" letter-spacing="0.8">BESCOM</text><text x="38" y="28" font-family="Arial,sans-serif" font-weight="600" font-size="7" fill="%2394a3b8" letter-spacing="0.2">BENGALURU DISCOM</text></svg>'
  },
  {
    id: 'msedcl',
    name: 'Mahavitaran',
    icon: 'ti-building-factory-2',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="140" height="36" viewBox="0 0 140 36"><rect x="3" y="3" width="30" height="30" rx="6" fill="%23dc2626"/><circle cx="18" cy="18" r="10" fill="%23ffffff"/><path d="M18 10 C14 14 13 18 15 22 C16 23 18 26 18 26 C18 26 20 23 21 22 C23 18 22 14 18 10 Z" fill="%23dc2626"/><text x="38" y="19" font-family="Arial,sans-serif" font-weight="900" font-size="11" fill="%23ffffff" letter-spacing="0.5">MAHAVITARAN</text><text x="38" y="28" font-family="Arial,sans-serif" font-weight="600" font-size="7" fill="%2394a3b8">MSEDCL DISCOM</text></svg>'
  },
  {
    id: 'zensmart',
    name: 'ZenSmart®',
    icon: 'ti-cpu',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="130" height="36" viewBox="0 0 130 36"><text x="4" y="21" font-family="Arial,sans-serif" font-weight="900" font-style="italic" font-size="15" fill="%23ffffff" letter-spacing="0.5">ZenSmart<tspan font-size="10" fill="%23ff5c00" font-style="normal" font-weight="bold">®</tspan></text><text x="4" y="30" font-family="Arial,sans-serif" font-weight="600" font-size="7" fill="%2394a3b8" letter-spacing="0.3">CELLULAR AMR/AMI</text></svg>'
  }
];

/**
 * Interactive Meter Body Placement Canvas & Editor
 * 
 * Features:
 * - NO Presets (clean, streamlined, professional)
 * - Single-row 3-column layout for Text: [ Font Size (stepper) ] [ Font Style ] [ Text Color ]
 * - 2-column clean layout for QR (Size & Color) and Logo (Width & Upload)
 * - Fixed CSS grid columns that never wrap on any window size
 * - Front Enclosure Laser Marking Preview header with compact, user-friendly view-mode buttons:
 *   [ CAD Body ] [ Polycarbonate ] [ Blueprint ] [ Vector Only ]
 * - Pure laser engraving look with NO text/bg shadows
 * - Full height-constrained display for all desktop screen sizes
 */
export default function MeterInteractiveTextEditor({
  variableTexts = [],
  onChangeTexts = () => {},
  logos = null,
  onChangeLogos = () => {},
  qrCodes = null,
  onChangeQrCodes = () => {},
  // Backwards compatibility props
  customLogoUrl = null,
  onChangeLogoUrl = null,
  logoPos = { leftPercent: 6.5, topPercent: 4.0 },
  onChangeLogoPos = null,
  qrValue = '',
  onChangeQrValue = null,
  qrPos = { leftPercent: 72, topPercent: 12.8 },
  onChangeQrPos = null,
  readOnly = false,
  maxWidth = '460px',
  canvasHeight = 'calc(88vh - 145px)',
  splitLayout = false,
  leftTopContent = null,
  leftBottomContent = null,
  hideHeader = false,
  viewMode: propViewMode = null,
  onViewModeChange = null,
  actualPrintImage = null,
  onChangeActualPrintImage = null,
  actualPrintImageName = '',
  onChangeActualPrintImageName = null,
  workOrderId = null,
  actualPrintOnly = false,
  hideControls = false
}) {
  const shouldHideControls = hideControls || actualPrintOnly;
  const containerRef = useRef(null);
  const canvasAreaRef = useRef(null);
  const actualPrintImgRef = useRef(null);
  const controlsTopRef = useRef(null);
  const fileInputRefs = useRef({});
  const actualPrintInputRef = useRef(null);
  const [canvasAreaSize, setCanvasAreaSize] = useState({ width: 0, height: 0 });
  const [actualPrintNaturalSize, setActualPrintNaturalSize] = useState({ width: 0, height: 0 });

  const scrollControlsToTop = () => {
    setTimeout(() => {
      controlsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 30);
  };

  // Active tab in controls: 'logos' | 'qr' | 'texts'
  const [activeTab, setActiveTab] = useState('qr');

  // Currently selected item: { type: 'logo'|'qr'|'text', id: string }
  const [selectedItem, setSelectedItem] = useState(() => (readOnly ? { type: null, id: null } : { type: 'qr', id: 'qr-1' }));

  // Dragging state: { type: 'logo'|'qr'|'text', id: string } | null
  const [draggingItem, setDraggingItem] = useState(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // View Mode / 3D Mode: 'cad' | 'polycarbonate' | 'actual_print' | 'blueprint' | 'vector_only'
  const [internalViewMode, setInternalViewMode] = useState(() => (actualPrintOnly ? 'actual_print' : 'cad'));
  const viewMode = actualPrintOnly
    ? 'actual_print'
    : ((propViewMode !== null && propViewMode !== undefined)
        ? (propViewMode === 'actual' ? 'polycarbonate' : propViewMode)
        : internalViewMode);
  const setViewMode = (mode) => {
    if (actualPrintOnly) return;
    setInternalViewMode(mode);
    if (onViewModeChange) onViewModeChange(mode);
  };

  // Uploaded Actual Print Meter Photo / PDF state (supports controlled or uncontrolled usage)
  const [internalActualPrintImage, setInternalActualPrintImage] = useState(null);
  const [internalActualPrintName, setInternalActualPrintName] = useState('');
  const [uploadingActualPrint, setUploadingActualPrint] = useState(false);
  const [cropUploadError, setCropUploadError] = useState('');
  const [pdfRenderedPreviewUrl, setPdfRenderedPreviewUrl] = useState(null);
  const lastUploadedSourceUrlRef = useRef(null);
  const [pendingCropFile, setPendingCropFile] = useState({
    isOpen: false,
    imageSrc: null,
    originalDataUrl: null,
    fileName: '',
    mimeType: '',
    outputMimeType: 'image/png',
    isPdf: false
  });
  const isActualPrintControlled = typeof onChangeActualPrintImage === 'function';
  const effectiveActualPrintImage = isActualPrintControlled
    ? actualPrintImage
    : (actualPrintImage || internalActualPrintImage);
  const effectiveActualPrintName = typeof onChangeActualPrintImageName === 'function'
    ? actualPrintImageName
    : (actualPrintImageName || internalActualPrintName);

  const resolvedActualPrintUrl = resolveBackendFileUrl(effectiveActualPrintImage);
  const isPdfActualPrint = Boolean(
    resolvedActualPrintUrl &&
    (resolvedActualPrintUrl.startsWith('data:application/pdf') || /\.pdf(\?.*)?$/i.test(resolvedActualPrintUrl))
  );

  useEffect(() => {
    let cancelled = false;
    if (!resolvedActualPrintUrl || !isPdfActualPrint) {
      setPdfRenderedPreviewUrl(null);
      return undefined;
    }
    renderPdfFirstPageToDataUrl(resolvedActualPrintUrl)
      .then((pngDataUrl) => {
        if (!cancelled) setPdfRenderedPreviewUrl(pngDataUrl);
      })
      .catch((err) => {
        console.warn('Could not render PDF preview:', err);
        if (!cancelled) setPdfRenderedPreviewUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedActualPrintUrl, isPdfActualPrint]);

  const displayedActualPrintSrc = isPdfActualPrint ? pdfRenderedPreviewUrl : resolvedActualPrintUrl;

  // Actual Print Zoom & Pan state
  const [actualPrintZoom, setActualPrintZoom] = useState(1);
  const [actualPrintPan, setActualPrintPan] = useState({ x: 0, y: 0 });
  const [isPanningActualPrint, setIsPanningActualPrint] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    setActualPrintZoom(1);
    setActualPrintPan({ x: 0, y: 0 });
    setActualPrintNaturalSize({ width: 0, height: 0 });
  }, [resolvedActualPrintUrl]);

  useEffect(() => {
    const img = actualPrintImgRef.current;
    if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      setActualPrintNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    }
  }, [displayedActualPrintSrc, viewMode]);

  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return undefined;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      setCanvasAreaSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    };
    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateSize);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [viewMode, displayedActualPrintSrc, splitLayout]);

  const handleResetActualPrintZoom = useCallback(() => {
    setActualPrintZoom(1);
    setActualPrintPan({ x: 0, y: 0 });
  }, []);

  const handleStepActualPrintZoom = useCallback((delta) => {
    setActualPrintZoom((prev) => {
      const next = Number(Math.min(4, Math.max(0.5, prev + delta)).toFixed(2));
      if (next <= 1) setActualPrintPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isPanningActualPrint) return undefined;
    const onMove = (ev) => {
      const dx = ev.clientX - panStartRef.current.x;
      const dy = ev.clientY - panStartRef.current.y;
      setActualPrintPan({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy
      });
    };
    const onUp = () => setIsPanningActualPrint(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isPanningActualPrint]);

  // Internal normalized list of Logos
  const effectiveLogos = Array.isArray(logos) ? logos : (
    customLogoUrl || logoPos ? [
      {
        id: 'logo-1',
        url: customLogoUrl || null,
        name: 'Primary Logo',
        width: 95,
        leftPercent: logoPos?.leftPercent ?? 6.5,
        topPercent: logoPos?.topPercent ?? 4.0
      }
    ] : []
  );

  // Internal normalized list of QR Codes
  const effectiveQrCodes = Array.isArray(qrCodes) ? qrCodes : (
    qrValue !== undefined ? [
      {
        id: 'qr-1',
        value: qrValue || '',
        size: 56,
        color: '#ffffff',
        bgColor: 'transparent',
        leftPercent: qrPos?.leftPercent ?? 72,
        topPercent: qrPos?.topPercent ?? 12.8
      }
    ] : []
  );

  // Helper to emit updated logos
  const emitLogos = (newList) => {
    onChangeLogos(newList);
    if (onChangeLogoUrl) onChangeLogoUrl(newList[0]?.url || null);
    if (onChangeLogoPos && newList[0]) {
      onChangeLogoPos({
        leftPercent: newList[0].leftPercent,
        topPercent: newList[0].topPercent,
        x: newList[0].x,
        y: newList[0].y
      });
    }
  };

  // Helper to emit updated QR codes
  const emitQrCodes = (newList) => {
    onChangeQrCodes(newList);
    if (onChangeQrValue) onChangeQrValue(newList[0]?.value || '');
    if (onChangeQrPos && newList[0]) {
      onChangeQrPos({
        leftPercent: newList[0].leftPercent,
        topPercent: newList[0].topPercent,
        x: newList[0].x,
        y: newList[0].y
      });
    }
  };

  // ==================== LOGO ACTIONS ====================
  const handleAddLogo = () => {
    const newId = `logo-${Date.now()}`;
    const nextNum = effectiveLogos.length + 1;
    const newLogo = {
      id: newId,
      url: null,
      name: `Logo #${nextNum}`,
      width: 95,
      leftPercent: 6.5 + ((nextNum - 1) * 26),
      topPercent: 4.0
    };
    const updated = [newLogo, ...effectiveLogos];
    emitLogos(updated);
    setSelectedItem({ type: 'logo', id: newId });
    setActiveTab('logos');
    scrollControlsToTop();
  };

  const handleDeleteLogo = (id) => {
    const updated = effectiveLogos.filter(l => l.id !== id);
    emitLogos(updated);
    if (selectedItem.id === id) {
      setSelectedItem(updated.length > 0 ? { type: 'logo', id: updated[0].id } : { type: 'qr', id: effectiveQrCodes[0]?.id });
    }
  };

  const handleUpdateLogoField = (id, field, value) => {
    const updated = effectiveLogos.map(l => l.id === id ? { ...l, [field]: value } : l);
    emitLogos(updated);
  };

  const handleUploadLogoFile = (id, file) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('Logo file size exceeds 3MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (dataUrl) {
        handleUpdateLogoField(id, 'url', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // ==================== ACTUAL PRINT PHOTO / PDF ACTIONS (JPG / PNG / PDF + CROP) ====================
  const handleUploadActualPrintFile = async (file) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const isAllowedExt = /\.(jpe?g|png|pdf)$/i.test(file.name || '');
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
    if (!allowedTypes.includes(file.type) && !isAllowedExt) {
      alert('Only JPG, PNG, and PDF formats are supported.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds 15MB limit.');
      return;
    }

    try {
      setCropUploadError('');
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result);
        reader.onerror = () => reject(new Error('Failed to read selected file.'));
        reader.readAsDataURL(file);
      });

      let cropSourceUrl = dataUrl;
      if (isPdf) {
        const buffer = await file.arrayBuffer();
        cropSourceUrl = await renderPdfFirstPageToDataUrl(buffer);
      }

      const outputMimeType = (!isPdf && (file.type === 'image/jpeg' || file.type === 'image/jpg' || /\.jpe?g$/i.test(file.name || '')))
        ? 'image/jpeg'
        : 'image/png';

      setPendingCropFile({
        isOpen: true,
        imageSrc: cropSourceUrl,
        originalDataUrl: dataUrl,
        fileName: file.name,
        mimeType: file.type || (isPdf ? 'application/pdf' : outputMimeType),
        outputMimeType,
        isPdf
      });
    } catch (err) {
      alert(err?.message || 'Failed to prepare file for cropping.');
    }
  };

  const handleCancelCrop = () => {
    setCropUploadError('');
    setPendingCropFile({
      isOpen: false,
      imageSrc: null,
      originalDataUrl: null,
      fileName: '',
      mimeType: '',
      outputMimeType: 'image/png',
      isPdf: false
    });
  };

  const handleConfirmCropUpload = async (croppedDataUrl) => {
    if (!croppedDataUrl) return;
    setUploadingActualPrint(true);
    setCropUploadError('');
    try {
      const { isPdf, fileName, originalDataUrl, outputMimeType } = pendingCropFile;
      const isJpeg = !isPdf && outputMimeType === 'image/jpeg';
      const baseName = String(fileName || 'actual_print').replace(/\.[^/.]+$/, '');
      const uploadPayload = isPdf
        ? {
            fileName,
            mimeType: 'application/pdf',
            dataUrl: originalDataUrl,
            previewImageDataUrl: croppedDataUrl,
            formId: workOrderId || undefined,
            previousFileUrl: effectiveActualPrintImage || undefined,
            previousSourceUrl: lastUploadedSourceUrlRef.current || undefined
          }
        : {
            fileName: `${baseName}.${isJpeg ? 'jpg' : 'png'}`,
            mimeType: isJpeg ? 'image/jpeg' : 'image/png',
            dataUrl: croppedDataUrl,
            formId: workOrderId || undefined,
            previousFileUrl: effectiveActualPrintImage || undefined,
            previousSourceUrl: lastUploadedSourceUrlRef.current || undefined
          };

      const res = await stageManagementService.uploadActualPrintFile(uploadPayload);
      const savedUrl = res.previewUrl || res.fileUrl;
      lastUploadedSourceUrlRef.current = res.fileUrl || null;

      if (typeof onChangeActualPrintImage === 'function') {
        onChangeActualPrintImage(savedUrl);
      } else {
        setInternalActualPrintImage(savedUrl);
      }
      if (typeof onChangeActualPrintImageName === 'function') {
        onChangeActualPrintImageName(res.fileName || fileName);
      } else {
        setInternalActualPrintName(res.fileName || fileName);
      }

      handleCancelCrop();
      handleResetActualPrintZoom();
      setViewMode('actual_print');
    } catch (err) {
      setCropUploadError(err?.message || 'Failed to upload and save cropped file to backend.');
    } finally {
      setUploadingActualPrint(false);
    }
  };

  const handleClearActualPrintImage = () => {
    lastUploadedSourceUrlRef.current = null;
    if (typeof onChangeActualPrintImage === 'function') {
      onChangeActualPrintImage(null);
    } else {
      setInternalActualPrintImage(null);
    }
    if (typeof onChangeActualPrintImageName === 'function') {
      onChangeActualPrintImageName('');
    } else {
      setInternalActualPrintName('');
    }
  };

  // ==================== QR ACTIONS ====================
  const handleAddQr = () => {
    const newId = `qr-${Date.now()}`;
    const nextNum = effectiveQrCodes.length + 1;
    const newQr = {
      id: newId,
      codeType: 'qr',
      value: `ZEN:BATCH-2026-01|QR-${nextNum}`,
      size: 56,
      color: '#ffffff',
      bgColor: 'transparent',
      leftPercent: 70 - (nextNum * 4),
      topPercent: 12 + (nextNum * 6)
    };
    const updated = [newQr, ...effectiveQrCodes];
    emitQrCodes(updated);
    setSelectedItem({ type: 'qr', id: newId });
    setActiveTab('qr');
    scrollControlsToTop();
  };

  const handleDeleteQr = (id) => {
    const updated = effectiveQrCodes.filter(q => q.id !== id);
    emitQrCodes(updated);
    if (selectedItem.id === id) {
      setSelectedItem(updated.length > 0 ? { type: 'qr', id: updated[0].id } : { type: 'text', id: variableTexts[0]?.id });
    }
  };

  const handleUpdateQrField = (id, field, value) => {
    const updated = effectiveQrCodes.map(q => q.id === id ? { ...q, [field]: value } : q);
    emitQrCodes(updated);
  };

  const handleUpdateQrFields = (id, patch) => {
    const updated = effectiveQrCodes.map(q => q.id === id ? { ...q, ...patch } : q);
    emitQrCodes(updated);
  };

  // ==================== TEXT ACTIONS (ADD / REMOVE) ====================
  const handleAddText = () => {
    const newId = `vt-${Date.now()}`;
    const nextNum = variableTexts.length + 1;
    const newText = {
      id: newId,
      text: `VARIABLE TEXT #${nextNum}`,
      x: 100,
      y: 40 + (nextNum * 25),
      leftPercent: 32.0,
      topPercent: 4.2 + ((nextNum - 1) * 6),
      fontSize: 12,
      fontWeight: 'bold',
      color: '#ffffff'
    };
    const updated = [newText, ...variableTexts];
    onChangeTexts(updated);
    setSelectedItem({ type: 'text', id: newId });
    setActiveTab('texts');
    scrollControlsToTop();
  };

  const handleDeleteText = (id) => {
    const updated = variableTexts.filter(t => t.id !== id);
    onChangeTexts(updated);
    if (selectedItem.id === id) {
      setSelectedItem(updated.length > 0 ? { type: 'text', id: updated[0].id } : { type: 'qr', id: effectiveQrCodes[0]?.id });
    }
  };

  const handleUpdateTextField = (id, field, value) => {
    const updated = variableTexts.map(t => t.id === id ? { ...t, [field]: value } : t);
    onChangeTexts(updated);
  };

  // ==================== DRAGGING LOGIC ====================
  const handleItemMouseDown = (e, type, id, leftPercent, topPercent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();

    setSelectedItem({ type, id });
    setDraggingItem({ type, id });

    if (type === 'logo') setActiveTab('logos');
    else if (type === 'qr') setActiveTab('qr');
    else if (type === 'text') setActiveTab('texts');

    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const itemLeft = ((leftPercent ?? 10) / 100) * containerRect.width;
    const itemTop = ((topPercent ?? 10) / 100) * containerRect.height;

    dragOffsetRef.current = {
      x: e.clientX - (containerRect.left + itemLeft),
      y: e.clientY - (containerRect.top + itemTop)
    };
  };

  const handleMouseMove = useCallback((e) => {
    if (!draggingItem || !containerRef.current || readOnly) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const rawX = e.clientX - containerRect.left - dragOffsetRef.current.x;
    const rawY = e.clientY - containerRect.top - dragOffsetRef.current.y;

    const clampedX = Math.max(2, Math.min(containerRect.width - 20, rawX));
    const clampedY = Math.max(2, Math.min(containerRect.height - 15, rawY));

    const leftPercent = Number(((clampedX / containerRect.width) * 100).toFixed(2));
    const topPercent = Number(((clampedY / containerRect.height) * 100).toFixed(2));
    const pixelX = Math.round(clampedX);
    const pixelY = Math.round(clampedY);

    if (draggingItem.type === 'logo') {
      const updated = effectiveLogos.map(l => l.id === draggingItem.id ? { ...l, leftPercent, topPercent, x: pixelX, y: pixelY } : l);
      emitLogos(updated);
    } else if (draggingItem.type === 'qr') {
      const updated = effectiveQrCodes.map(q => q.id === draggingItem.id ? { ...q, leftPercent, topPercent, x: pixelX, y: pixelY } : q);
      emitQrCodes(updated);
    } else if (draggingItem.type === 'text') {
      onChangeTexts(prev => prev.map(t => {
        if (t.id === draggingItem.id) {
          return { ...t, leftPercent, topPercent, x: pixelX, y: pixelY };
        }
        return t;
      }));
    }
  }, [draggingItem, effectiveLogos, effectiveQrCodes, onChangeTexts, readOnly]);

  const handleMouseUp = useCallback(() => {
    if (draggingItem) setDraggingItem(null);
  }, [draggingItem]);

  useEffect(() => {
    if (draggingItem) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingItem, handleMouseMove, handleMouseUp]);

  // Color preset options
  const COLOR_PRESETS = [
    { label: 'Laser White', value: '#ffffff' },
    { label: 'Gold / Yellow', value: '#facc15' },
    { label: 'Sky Cyan', value: '#38bdf8' },
    { label: 'Neon Green', value: '#4ade80' },
    { label: 'Laser Coral', value: '#f87171' },
    { label: 'Laser Black', value: '#0f172a' }
  ];

  // Determine container styling & filter based on viewMode
  let containerBg = '#ffffff';
  let bodyFilter = 'none';
  if (viewMode === 'polycarbonate') {
    containerBg = 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)';
    bodyFilter = 'brightness(1.55) contrast(0.85) grayscale(0.95)';
  } else if (viewMode === 'actual_print') {
    containerBg = '#f8fafc';
    bodyFilter = 'none';
  } else if (viewMode === 'blueprint') {
    containerBg = '#0f172a';
    bodyFilter = 'hue-rotate(180deg) brightness(0.65) invert(0.8)';
  } else if (viewMode === 'vector_only') {
    containerBg = '#ffffff';
    bodyFilter = 'opacity(0.10)';
  }

  // ==================== RIGHT SIDE: CLEAN METER CANVAS ====================
  const renderCanvas = () => {
    const isSplit = Boolean(splitLayout || leftTopContent);
    const isActualPrintImageReady =
      viewMode === 'actual_print' &&
      Boolean(effectiveActualPrintImage && displayedActualPrintSrc) &&
      actualPrintNaturalSize.width > 0 &&
      actualPrintNaturalSize.height > 0;
    const targetAspect = isActualPrintImageReady
      ? (actualPrintNaturalSize.width / actualPrintNaturalSize.height)
      : (938 / 1010);

    let frameDimensionsStyle = {
      maxHeight: '100%',
      height: isSplit ? '100%' : canvasHeight,
      aspectRatio: `${targetAspect}`,
      maxWidth: '100%',
      width: 'auto'
    };

    if (canvasAreaSize.width > 20 && canvasAreaSize.height > 20) {
      const availW = Math.max(80, canvasAreaSize.width - 8);
      const availH = Math.max(80, canvasAreaSize.height - 8);
      const fitW = Math.min(availW, availH * targetAspect);
      const fitH = fitW / targetAspect;
      frameDimensionsStyle = {
        width: `${Math.floor(fitW)}px`,
        height: `${Math.floor(fitH)}px`,
        maxWidth: '100%',
        maxHeight: '100%'
      };
    }

    return (
    <div className="w-100 h-100 d-flex flex-column align-items-center" style={{ maxWidth: '100%', overflow: 'hidden', minHeight: 0 }}>
      {/* Hidden JPG / PNG / PDF file input for Actual Print Meter */}
      {!readOnly && (
        <input
          ref={actualPrintInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
          className="d-none"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleUploadActualPrintFile(file);
            }
            e.target.value = '';
          }}
        />
      )}

      {/* Canvas Top Bar: Header & 3D Mode Switcher on Top */}
      {!hideHeader && (
        <div className="d-flex align-items-center justify-content-between w-100 mb-2 px-1 flex-wrap gap-2 flex-shrink-0">
          <div className="d-flex align-items-center gap-2">
            <i className="ti ti-cpu text-primary fs-5"></i>
            <h6 className="mb-0 fw-bold text-dark" style={{ fontSize: '13px' }}>
              Laser Marking Preview
            </h6>
          </div>

          {/* 3D Mode Switcher (CAD Body & Polycarbonate Body) + Separate Actual Print Button */}
          <div className="d-flex align-items-center flex-wrap gap-2">
            {!actualPrintOnly && (
              <div className="d-flex align-items-center flex-wrap gap-1 bg-white p-1 rounded-2 border shadow-2xs">
                <button
                  type="button"
                  className={`btn btn-xs fw-semibold px-2 py-1 d-inline-flex align-items-center gap-1.5 rounded-2 transition-all ${
                    viewMode === 'cad'
                      ? 'btn-primary text-white shadow-xs'
                      : 'btn-outline-secondary bg-light-subtle text-dark border-0'
                  }`}
                  onClick={() => setViewMode('cad')}
                  title="CAD Master Purple Body"
                >
                  <span
                    className="rounded-circle d-inline-block flex-shrink-0"
                    style={{
                      width: '9px',
                      height: '9px',
                      backgroundColor: '#5c3a67',
                      border: viewMode === 'cad' ? '1.5px solid #fff' : '1px solid #94a3b8'
                    }}
                  ></span>
                  <span style={{ fontSize: '11.5px' }}>CAD Body</span>
                </button>

                <button
                  type="button"
                  className={`btn btn-xs fw-semibold px-2 py-1 d-inline-flex align-items-center gap-1.5 rounded-2 transition-all ${
                    viewMode === 'polycarbonate'
                      ? 'btn-primary text-white shadow-xs'
                      : 'btn-outline-secondary bg-light-subtle text-dark border-0'
                  }`}
                  onClick={() => setViewMode('polycarbonate')}
                  title="Polycarbonate Body finish"
                >
                  <span
                    className="rounded-circle d-inline-block flex-shrink-0"
                    style={{
                      width: '9px',
                      height: '9px',
                      backgroundColor: '#334155',
                      border: viewMode === 'polycarbonate' ? '1.5px solid #fff' : '1px solid #94a3b8'
                    }}
                  ></span>
                  <span style={{ fontSize: '11.5px' }}>Polycarbonate Body</span>
                </button>
              </div>
            )}

            <button
              type="button"
              className={`btn btn-xs fw-semibold px-2.5 py-1.5 d-inline-flex align-items-center gap-1.5 rounded-2 border shadow-2xs transition-all ${
                viewMode === 'actual_print'
                  ? 'text-white'
                  : 'bg-white text-dark'
              }`}
              style={{
                backgroundColor: viewMode === 'actual_print' ? '#ea580c' : '#ffffff',
                borderColor: viewMode === 'actual_print' ? '#ea580c' : '#cbd5e1',
                fontSize: '11.5px',
                cursor: actualPrintOnly ? 'default' : 'pointer'
              }}
              onClick={() => setViewMode('actual_print')}
              title="Actual Print Preview (JPG / PNG / PDF)"
            >
              <i
                className="ti ti-photo"
                style={{ fontSize: '13px', color: viewMode === 'actual_print' ? '#ffffff' : '#ea580c' }}
              ></i>
              <span>
                Actual Print{' '}
                <span style={{ color: viewMode === 'actual_print' ? '#ffedd5' : '#ea580c', fontWeight: 'bold' }}>*</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Visual Canvas: Maximized Full Size Centered (Auto-scaled to fit without scrolling or clipping) */}
      <div
        ref={canvasAreaRef}
        className={`d-flex align-items-center justify-content-center w-100 ${isSplit ? 'flex-grow-1' : ''}`}
        style={{
          minHeight: 0,
          height: isSplit ? undefined : canvasHeight,
          overflow: 'hidden'
        }}
      >
        <div
          ref={containerRef}
          className="position-relative user-select-none rounded-3 border"
          style={{
            ...frameDimensionsStyle,
            background: containerBg,
            cursor:
              viewMode === 'actual_print'
                ? (displayedActualPrintSrc && actualPrintZoom > 1 ? (isPanningActualPrint ? 'grabbing' : 'grab') : 'default')
                : (readOnly ? 'default' : 'crosshair'),
            boxShadow: '0 8px 30px rgba(15, 23, 42, 0.2)',
            overflow: 'hidden'
          }}
          title={
            viewMode === 'actual_print'
              ? (displayedActualPrintSrc ? 'Scroll to zoom; drag when zoomed in to pan' : '')
              : (readOnly ? '' : 'Click and drag Logo, QR Code, or Text to place anywhere on the meter body')
          }
          onWheel={(e) => {
            if (viewMode !== 'actual_print' || !displayedActualPrintSrc) return;
            e.preventDefault();
            handleStepActualPrintZoom(e.deltaY < 0 ? 0.15 : -0.15);
          }}
          onMouseDown={(e) => {
            if (viewMode !== 'actual_print' || !displayedActualPrintSrc || actualPrintZoom <= 1) return;
            if (e.button !== 0) return;
            e.preventDefault();
            setIsPanningActualPrint(true);
            panStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              panX: actualPrintPan.x,
              panY: actualPrintPan.y
            };
          }}
        >
        {/* Base Meter Body Image - Fitted cleanly with dynamic viewMode filter or Uploaded Actual Print Photo/PDF */}
        {viewMode === 'actual_print' ? (
          effectiveActualPrintImage ? (
            displayedActualPrintSrc ? (
              <img
                ref={actualPrintImgRef}
                src={displayedActualPrintSrc}
                alt="Actual Print Meter"
                className="w-100 h-100 position-absolute top-0 start-0"
                onLoad={(e) => {
                  const nw = e.currentTarget.naturalWidth;
                  const nh = e.currentTarget.naturalHeight;
                  if (nw > 0 && nh > 0) {
                    setActualPrintNaturalSize((prev) =>
                      prev.width === nw && prev.height === nh ? prev : { width: nw, height: nh }
                    );
                  }
                }}
                style={{
                  objectFit: 'contain',
                  filter: 'none',
                  pointerEvents: 'none',
                  transform: `translate(${actualPrintPan.x}px, ${actualPrintPan.y}px) scale(${actualPrintZoom})`,
                  transformOrigin: 'center center',
                  transition: isPanningActualPrint ? 'none' : 'transform 0.15s ease-out'
                }}
              />
            ) : (
              <div
                className="w-100 h-100 position-absolute top-0 start-0 d-flex flex-column align-items-center justify-content-center text-center p-4"
                style={{ zIndex: 5 }}
              >
                <span className="spinner-border spinner-border-sm text-primary mb-2"></span>
                <span className="small text-muted">Rendering PDF preview...</span>
              </div>
            )
          ) : (
            <div
              className="w-100 h-100 position-absolute top-0 start-0 d-flex flex-column align-items-center justify-content-center text-center p-4"
              style={{ zIndex: 5 }}
            >
              {!readOnly ? (
                <button
                  type="button"
                  disabled={uploadingActualPrint}
                  className="btn btn-md fw-semibold text-white d-inline-flex align-items-center gap-2 px-4 py-2 rounded-2 shadow-sm"
                  style={{ backgroundColor: '#ea580c', borderColor: '#ea580c' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    actualPrintInputRef.current?.click();
                  }}
                >
                  {uploadingActualPrint ? (
                    <>
                      <span className="spinner-border spinner-border-sm"></span>
                      <span>Saving to Backend...</span>
                    </>
                  ) : (
                    <>
                      <i className="ti ti-cloud-upload fs-5"></i>
                      <span>Upload JPG / PNG / PDF</span>
                    </>
                  )}
                </button>
              ) : (
                <p className="text-muted small mb-0">No Actual Print file uploaded</p>
              )}
            </div>
          )
        ) : (
          <img
            src={meterBodyCADImg}
            alt="Meter Body Template"
            className="w-100 h-100 position-absolute top-0 start-0"
            style={{ objectFit: 'contain', filter: bodyFilter, pointerEvents: 'none' }}
          />
        )}

        {/* In Actual Print mode, show ONLY the uploaded PDF / PNG / JPG (no editor overlays) */}
        {viewMode !== 'actual_print' && (
        <>
        {/* 1. DRAGGABLE LOGOS - Clean transparent background, proportionally scaled to canvas */}
        {effectiveLogos.map((item, idx) => {
          const isSelected = !readOnly && selectedItem.type === 'logo' && selectedItem.id === item.id;
          const isDragging = !readOnly && draggingItem?.type === 'logo' && draggingItem?.id === item.id;
          const logoWidth = item.width !== undefined && item.width !== null ? item.width : 110;
          const logoWidthPercent = Number(((logoWidth / 460) * 100).toFixed(2));

          return (
            <div
              key={item.id || idx}
              className="position-absolute d-inline-flex flex-column align-items-start"
              style={{
                top: `${item.topPercent ?? 4.2}%`,
                left: `${item.leftPercent ?? 10.5}%`,
                width: `${logoWidthPercent}%`,
                zIndex: isDragging ? 40 : (isSelected ? 30 : 22),
                cursor: isDragging ? 'grabbing' : (readOnly ? 'default' : 'grab'),
                outline: !readOnly && (isSelected || isDragging) ? '1.5px dashed #f97316' : 'none',
                outlineOffset: !readOnly && (isSelected || isDragging) ? '2px' : '0',
                background: 'transparent',
                borderRadius: '3px',
                padding: '1px',
                transform: isDragging ? 'scale(1.03)' : 'scale(1)',
                transition: isDragging ? 'none' : 'transform 0.1s ease'
              }}
              onMouseDown={readOnly ? undefined : (e) => handleItemMouseDown(e, 'logo', item.id, item.leftPercent, item.topPercent)}
              onClick={readOnly ? undefined : (e) => {
                e.stopPropagation();
                setSelectedItem({ type: 'logo', id: item.id });
                setActiveTab('logos');
              }}
              title={readOnly ? undefined : `Logo #${idx + 1}. Drag to reposition.`}
            >
              {item.url ? (
                <img
                  src={item.url}
                  alt={item.name || 'Logo'}
                  style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                />
              ) : (
                <div className="d-flex align-items-center gap-1.5 py-0.5 w-100">
                  <img src={zenmeterLogoImg} alt="Zenmeter Logo" style={{ width: '24%', height: 'auto' }} />
                  <span
                    className="fw-bold text-truncate"
                    style={{
                      fontSize: '11px',
                      color: viewMode === 'blueprint' ? '#38bdf8' : (viewMode === 'polycarbonate' || viewMode === 'vector_only' ? '#0f172a' : '#ffffff'),
                      textShadow: 'none'
                    }}
                  >
                    ZenMeter
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* 2. DRAGGABLE DYNAMIC QR / BARCODES - Proportionally scaled to canvas */}
        {effectiveQrCodes.map((item, idx) => {
          const isSelected = !readOnly && selectedItem.type === 'qr' && selectedItem.id === item.id;
          const isDragging = !readOnly && draggingItem?.type === 'qr' && draggingItem?.id === item.id;
          const isBarcode = item.codeType === 'barcode' || item.type === 'barcode';
          const qrBoxSize = item.size !== undefined && item.size !== null ? item.size : 56;
          const barcodeWidthMm = Math.max(MIN_BARCODE_WIDTH_MM, Number(item.widthMm) || MIN_BARCODE_WIDTH_MM);
          const barcodeHeightMm = Math.max(MIN_BARCODE_HEIGHT_MM, Number(item.heightMm) || MIN_BARCODE_HEIGHT_MM);
          const renderBoxWidth = isBarcode ? (barcodeWidthMm * MM_TO_CANVAS_PX) : qrBoxSize;
          const qrSizePercent = Number(((renderBoxWidth / 460) * 100).toFixed(2));
          const maxLeft = Math.max(2, 98 - qrSizePercent);
          const clampedLeftPercent = isBarcode
            ? Math.min(item.leftPercent ?? 12, maxLeft)
            : (item.leftPercent ?? 72);
          const qrVal = item.value && item.value.trim() ? item.value.trim() : 'ZENMETER:SAMPLE-QR';
          const defaultQrColor = viewMode === 'blueprint' ? '#38bdf8' : (viewMode === 'polycarbonate' || viewMode === 'vector_only' || isBarcode ? '#0f172a' : '#ffffff');
          const qrColor = item.color || defaultQrColor;
          const qrBg = 'transparent';

          return (
            <div
              key={item.id || idx}
              className="position-absolute d-inline-flex flex-column align-items-center"
              style={{
                top: `${item.topPercent ?? 12.8}%`,
                left: `${clampedLeftPercent}%`,
                width: `${qrSizePercent}%`,
                aspectRatio: isBarcode ? `${barcodeWidthMm} / ${barcodeHeightMm}` : '1 / 1',
                zIndex: isDragging ? 40 : (isSelected ? 30 : 22),
                cursor: isDragging ? 'grabbing' : (readOnly ? 'default' : 'grab'),
                outline: !readOnly && (isSelected || isDragging) ? '1.5px dashed #38bdf8' : 'none',
                outlineOffset: !readOnly && (isSelected || isDragging) ? '2px' : '0',
                background: qrBg,
                borderRadius: '2px',
                transform: isDragging ? 'scale(1.03)' : 'scale(1)',
                transition: isDragging ? 'none' : 'transform 0.1s ease',
                filter: 'none'
              }}
              onMouseDown={readOnly ? undefined : (e) => handleItemMouseDown(e, 'qr', item.id, item.leftPercent, item.topPercent)}
              onClick={readOnly ? undefined : (e) => {
                e.stopPropagation();
                setSelectedItem({ type: 'qr', id: item.id });
                setActiveTab('qr');
              }}
              title={readOnly ? undefined : `${isBarcode ? 'Barcode' : 'QR Code'} #${idx + 1}: "${qrVal}". Drag to reposition.`}
            >
              {isBarcode ? (
                <BarcodeSVG
                  value={qrVal}
                  width="100%"
                  height="100%"
                  color={qrColor}
                  bgColor={qrBg}
                />
              ) : (
                <QRCodeSVG
                  value={qrVal}
                  size="100%"
                  color={qrColor}
                  bgColor={qrBg}
                />
              )}
            </div>
          );
        })}

        {/* 3. DRAGGABLE VARIABLE TEXTS - Transparent background, NO text shadow, user-chosen laser color */}
        {variableTexts.map((item, idx) => {
          const isSelected = !readOnly && selectedItem.type === 'text' && selectedItem.id === item.id;
          const isDragging = !readOnly && draggingItem?.type === 'text' && draggingItem?.id === item.id;
          const defaultTextColor = viewMode === 'blueprint' ? '#38bdf8' : (viewMode === 'polycarbonate' || viewMode === 'vector_only' ? '#0f172a' : '#ffffff');
          const textColor = item.color || defaultTextColor;

          return (
            <div
              key={item.id || idx}
              className="draggable-text-item position-absolute d-inline-flex align-items-center"
              style={{
                top: `${item.topPercent ?? 10}%`,
                left: `${item.leftPercent ?? 20}%`,
                fontSize: `${item.fontSize !== undefined && item.fontSize !== null ? item.fontSize : 13}px`,
                fontWeight: item.fontWeight || 'bold',
                color: textColor,
                cursor: isDragging ? 'grabbing' : (readOnly ? 'default' : 'grab'),
                userSelect: 'none',
                whiteSpace: 'nowrap',
                zIndex: isDragging ? 40 : (isSelected ? 30 : 20),
                outline: !readOnly && (isSelected || isDragging) ? '1.5px dashed #38bdf8' : 'none',
                outlineOffset: !readOnly && (isSelected || isDragging) ? '2px' : '0',
                background: 'transparent',
                padding: '1px 3px',
                borderRadius: '2px',
                textShadow: 'none',
                filter: 'none',
                transform: isDragging ? 'scale(1.03)' : 'scale(1)',
                transition: isDragging ? 'none' : 'transform 0.1s ease'
              }}
              onMouseDown={readOnly ? undefined : (e) => handleItemMouseDown(e, 'text', item.id, item.leftPercent, item.topPercent)}
              onClick={readOnly ? undefined : (e) => {
                e.stopPropagation();
                setSelectedItem({ type: 'text', id: item.id });
                setActiveTab('texts');
              }}
              title={readOnly ? undefined : `Text: "${item.text}". Drag with mouse to position.`}
            >
              <span>{item.text || '(Empty text)'}</span>
            </div>
          );
        })}
        </>
        )}
        </div>
      </div>

      {/* Dedicated Zoom & Reupload Controls Bar Below Canvas (never overlaps uploaded meter image) */}
      {viewMode === 'actual_print' && effectiveActualPrintImage && displayedActualPrintSrc && (
        <div className="d-flex align-items-center justify-content-center flex-wrap gap-2 mt-2 flex-shrink-0">
          <div className="d-inline-flex align-items-center gap-1 bg-white border rounded-pill px-2 py-1 shadow-2xs">
            <button
              type="button"
              className="btn btn-xs btn-light rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
              style={{ width: '22px', height: '22px', minHeight: '22px' }}
              disabled={actualPrintZoom <= 0.5}
              onClick={() => handleStepActualPrintZoom(-0.25)}
              title="Zoom Out (-25%)"
            >
              <i className="ti ti-zoom-out" style={{ fontSize: '12px' }}></i>
            </button>
            <button
              type="button"
              className="btn btn-xs btn-link text-decoration-none fw-bold font-mono text-dark px-1.5 py-0"
              style={{ fontSize: '11px', minWidth: '42px', minHeight: '22px' }}
              onClick={handleResetActualPrintZoom}
              title="Reset Zoom to 100%"
            >
              {Math.round(actualPrintZoom * 100)}%
            </button>
            <button
              type="button"
              className="btn btn-xs btn-light rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
              style={{ width: '22px', height: '22px', minHeight: '22px' }}
              disabled={actualPrintZoom >= 4}
              onClick={() => handleStepActualPrintZoom(0.25)}
              title="Zoom In (+25%)"
            >
              <i className="ti ti-zoom-in" style={{ fontSize: '12px' }}></i>
            </button>
            {(actualPrintZoom !== 1 || actualPrintPan.x !== 0 || actualPrintPan.y !== 0) && (
              <button
                type="button"
                className="btn btn-xs btn-outline-secondary rounded-pill px-2 py-0 ms-0.5"
                style={{ fontSize: '10px', height: '20px', minHeight: '20px' }}
                onClick={handleResetActualPrintZoom}
                title="Reset Zoom & Position"
              >
                Reset
              </button>
            )}
          </div>

          {!readOnly && (
            <button
              type="button"
              disabled={uploadingActualPrint}
              className="btn btn-xs fw-semibold text-white rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1 shadow-2xs"
              style={{
                backgroundColor: '#ea580c',
                borderColor: '#ea580c',
                fontSize: '11px',
                height: '28px',
                minHeight: '28px'
              }}
              onClick={() => actualPrintInputRef.current?.click()}
              title="Reupload JPG, PNG, or PDF"
            >
              <i className="ti ti-upload" style={{ fontSize: '12px' }}></i>
              <span>{uploadingActualPrint ? 'Uploading...' : 'Reupload'}</span>
            </button>
          )}
        </div>
      )}

      {/* Interactive Crop Modal on Image / PDF Upload */}
      {!readOnly && (
        <ImageCropModal
          isOpen={pendingCropFile.isOpen}
          imageSrc={pendingCropFile.imageSrc}
          fileName={pendingCropFile.fileName}
          outputMimeType={pendingCropFile.outputMimeType || 'image/png'}
          errorMessage={cropUploadError}
          submitting={uploadingActualPrint}
          onCancel={handleCancelCrop}
          onConfirm={handleConfirmCropUpload}
        />
      )}
    </div>
    );
  };

  // ==================== LEFT SIDE: ELEMENT CONTROLS ====================
  const renderControls = () => (
    <div ref={controlsTopRef} className="rounded-3 p-3 border" style={{ backgroundColor: '#fafaf9', borderColor: '#e5e7eb' }}>
      {/* Navigation Segmented Control */}
      <div
        className="d-flex align-items-center p-1 mb-3 rounded-2 border"
        style={{ backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', gap: '6px' }}
      >
        {[
          { key: 'logos', label: 'Logo', count: effectiveLogos.length, icon: 'ti-photo' },
          { key: 'qr', label: 'QR / Barcode', count: effectiveQrCodes.length, icon: 'ti-qrcode' },
          { key: 'texts', label: 'Text Label', count: variableTexts.length, icon: 'ti-typography' }
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={`btn btn-sm flex-fill fw-semibold d-inline-flex align-items-center justify-content-center gap-2 rounded-2 transition-all ${
                isActive
                  ? 'bg-white text-dark shadow-xs'
                  : 'bg-transparent text-secondary'
              }`}
              style={{
                height: '36px',
                fontSize: '12px',
                border: isActive ? '1px solid #fed7aa' : '1px solid transparent',
                borderBottom: isActive ? '2.5px solid #ea580c' : '2.5px solid transparent'
              }}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === 'logos' && effectiveLogos[0]) setSelectedItem({ type: 'logo', id: effectiveLogos[0].id });
                if (tab.key === 'qr' && effectiveQrCodes[0]) setSelectedItem({ type: 'qr', id: effectiveQrCodes[0].id });
                if (tab.key === 'texts' && variableTexts[0]) setSelectedItem({ type: 'text', id: variableTexts[0].id });
              }}
            >
              <i className={`ti ${tab.icon}`} style={{ color: isActive ? '#ea580c' : '#64748b', fontSize: '15px' }}></i>
              <span>{tab.label}</span>
              <span
                className="badge rounded-pill font-mono"
                style={{
                  backgroundColor: isActive ? '#fff7ed' : '#e2e8f0',
                  color: isActive ? '#ea580c' : '#64748b',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 7px',
                  border: isActive ? '1px solid #ffedd5' : '1px solid transparent'
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: LOGOS CONFIGURATION ==================== */}
      {activeTab === 'logos' && (
        <div className="bg-white p-3 rounded-2 border">
          {effectiveLogos.length === 0 ? (
            <div className="text-center py-4 text-muted bg-light rounded border border-dashed">
              <i className="ti ti-photo-off fs-3 text-secondary opacity-50 d-block mb-1"></i>
              <span className="small d-block mb-2">No logo on meter body.</span>
              <button
                type="button"
                className="btn btn-xs fw-semibold"
                style={{ backgroundColor: '#ea580c', color: '#fff' }}
                onClick={handleAddLogo}
              >
                <i className="ti ti-plus me-1"></i>Add Logo Now
              </button>
            </div>
          ) : (
            <div className="vstack gap-3">
              {effectiveLogos.map((item) => {
                const isSelected = selectedItem.type === 'logo' && selectedItem.id === item.id;
                const currentWidth = item.width !== undefined && item.width !== null ? item.width : 95;
                const isPreset = PRESET_UTILITY_LOGOS.some(p => p.url === item.url);
                const isCustomUpload = Boolean(item.url && !isPreset);

                return (
                  <div
                    key={item.id}
                    className="rounded-3 border transition-all bg-white p-3"
                    style={{
                      borderColor: isSelected ? '#ea580c' : '#e2e8f0',
                      boxShadow: isSelected ? '0 0 0 3px rgba(234, 88, 12, 0.08), 0 2px 8px rgba(0,0,0,0.04)' : '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                    onClick={() => setSelectedItem({ type: 'logo', id: item.id })}
                  >
                    {/* Hidden file input */}
                    <input
                      ref={el => fileInputRefs.current[item.id] = el}
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml, image/webp"
                      className="d-none"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadLogoFile(item.id, file);
                          handleUpdateLogoField(item.id, 'name', file.name.replace(/\.[^/.]+$/, ''));
                        }
                      }}
                    />

                    {/* 1. Logo File Upload & Actions Header */}
                    <div className="mb-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <label className="text-secondary fw-semibold small mb-0" style={{ fontSize: '11px' }}>
                          Logo
                        </label>

                        <div className="d-flex align-items-center gap-2">
                          {item.url && (
                            <button
                              type="button"
                              className="btn btn-link btn-xs p-0 text-decoration-none fw-semibold"
                              style={{ fontSize: '11px', color: '#ea580c' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateLogoField(item.id, 'url', null);
                                handleUpdateLogoField(item.id, 'name', 'ZenMeter Logo');
                              }}
                              title="Reset to default ZenMeter logo"
                            >
                              <i className="ti ti-rotate-2 me-0.5"></i>Reset to ZenMeter
                            </button>
                          )}
                          {effectiveLogos.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-xs text-danger d-inline-flex align-items-center gap-1 p-0 border-0"
                              style={{ fontSize: '11px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLogo(item.id);
                              }}
                              title="Delete this logo"
                            >
                              <i className="ti ti-trash"></i>
                              <span>Delete</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-xs d-inline-flex align-items-center gap-1 fw-semibold border-0 text-white"
                            style={{
                              height: '20px',
                              minHeight: '20px',
                              padding: '0 6px',
                              fontSize: '10px',
                              borderRadius: '4px',
                              backgroundColor: '#ea580c',
                              color: '#ffffff',
                              lineHeight: 1,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 1px 2px rgba(234, 88, 12, 0.25)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddLogo();
                            }}
                            title="Add another logo"
                          >
                            <i className="ti ti-plus" style={{ fontSize: '10px' }}></i>
                            <span>Add Logo</span>
                          </button>
                        </div>
                      </div>

                      {/* Prominent Upload Button */}
                      <button
                        type="button"
                        className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-2 transition-all"
                        style={{
                          fontSize: '12px',
                          backgroundColor: item.url ? '#fff7ed' : '#ffffff',
                          borderColor: item.url ? '#ea580c' : '#cbd5e1',
                          borderStyle: item.url ? 'solid' : 'dashed',
                          color: item.url ? '#c2410c' : '#475569'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRefs.current[item.id]?.click();
                        }}
                      >
                        <i className={`ti ${item.url ? 'ti-photo-check' : 'ti-cloud-upload'}`} style={{ color: '#ea580c', fontSize: '16px' }}></i>
                        <span className="fw-medium">
                          {item.url
                            ? `Custom Logo: ${item.name || 'Uploaded File'} (Click to change)`
                            : 'Upload Custom Logo (PNG, SVG, JPG - Max 3MB)'}
                        </span>
                      </button>
                    </div>

                    {/* 2. Logo Width Slider & Stepper */}
                    <div className="pt-1">
                      <label className="text-secondary fw-semibold small mb-1.5 d-block" style={{ fontSize: '11px' }}>
                        Logo Width
                      </label>

                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="range"
                          className="form-range flex-grow-1"
                          min="0"
                          max="220"
                          step="5"
                          value={currentWidth}
                          onChange={(e) => handleUpdateLogoField(item.id, 'width', Number(e.target.value))}
                          style={{ accentColor: '#ea580c', cursor: 'pointer' }}
                        />

                        <div
                          className="d-flex align-items-center bg-white border rounded shadow-2xs px-1 flex-shrink-0"
                          style={{ height: '30px', width: '95px' }}
                        >
                          <button
                            type="button"
                            className="btn btn-sm btn-link p-0 text-secondary text-decoration-none d-flex align-items-center justify-content-center"
                            style={{ width: '18px', height: '100%' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateLogoField(item.id, 'width', Math.max(0, currentWidth - 5));
                            }}
                            title="Decrease width (-5px)"
                          >
                            <i className="ti ti-minus" style={{ fontSize: '11px' }}></i>
                          </button>
                          <input
                            type="number"
                            className="form-control form-control-sm border-0 text-center font-mono p-0 fw-bold text-dark flex-grow-1"
                            style={{ minWidth: '24px', fontSize: '12px', background: 'transparent', boxShadow: 'none' }}
                            min="0"
                            max="250"
                            value={currentWidth}
                            onChange={(e) => handleUpdateLogoField(item.id, 'width', Math.max(0, Math.min(250, Number(e.target.value) || 0)))}
                          />
                          <span className="text-muted pe-1" style={{ fontSize: '10px', userSelect: 'none' }}>px</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-link p-0 text-secondary text-decoration-none d-flex align-items-center justify-content-center"
                            style={{ width: '18px', height: '100%' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateLogoField(item.id, 'width', Math.min(250, currentWidth + 5));
                            }}
                            title="Increase width (+5px)"
                          >
                            <i className="ti ti-plus" style={{ fontSize: '11px' }}></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: QR CODES CONFIGURATION ==================== */}
      {activeTab === 'qr' && (
        <div className="bg-white p-3 rounded-3 border" style={{ borderColor: '#e2e8f0' }}>
          {effectiveQrCodes.length === 0 ? (
            <div className="text-center py-4 text-muted bg-light rounded border border-dashed">
              <i className="ti ti-qrcode-off fs-3 text-secondary opacity-50 d-block mb-1"></i>
              <span className="small d-block mb-2">No QR code on meter body.</span>
              <button
                type="button"
                className="btn btn-xs fw-semibold"
                style={{ backgroundColor: '#ea580c', color: '#fff' }}
                onClick={handleAddQr}
              >
                <i className="ti ti-plus me-1"></i>Add QR Code Now
              </button>
            </div>
          ) : (
            <div className="vstack gap-3">
              {effectiveQrCodes.map((item) => {
                const isSelected = selectedItem.type === 'qr' && selectedItem.id === item.id;
                const isBarcode = item.codeType === 'barcode' || item.type === 'barcode';
                const effectiveVal = item.value || '';
                const qrColor = item.color || (isBarcode ? '#0f172a' : '#ffffff');
                const currentSize = item.size !== undefined && item.size !== null ? item.size : 56;
                const currentWidthMm = Math.max(MIN_BARCODE_WIDTH_MM, Number(item.widthMm) || MIN_BARCODE_WIDTH_MM);
                const currentHeightMm = Math.max(MIN_BARCODE_HEIGHT_MM, Number(item.heightMm) || MIN_BARCODE_HEIGHT_MM);

                return (
                  <div
                    key={item.id}
                    className="rounded-3 border transition-all bg-white p-3"
                    style={{
                      borderColor: isSelected ? '#ea580c' : '#e2e8f0',
                      boxShadow: isSelected
                        ? '0 0 0 3px rgba(234, 88, 12, 0.08), 0 2px 8px rgba(0,0,0,0.04)'
                        : '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                    onClick={() => setSelectedItem({ type: 'qr', id: item.id })}
                  >
                    {/* 1. Code Content / Type Header & Actions */}
                    <div className="mb-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <label className="text-secondary fw-semibold small mb-0" style={{ fontSize: '11px' }}>
                          {isBarcode ? 'Barcode Content' : 'QR Content'}
                        </label>
                        <div className="d-flex align-items-center gap-2">
                          {effectiveVal && (
                            <button
                              type="button"
                              className="btn btn-link btn-xs p-0 text-decoration-none fw-semibold"
                              style={{ fontSize: '11px', color: '#ea580c' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateQrField(item.id, 'value', '');
                              }}
                              title="Clear code content"
                            >
                              <i className="ti ti-x me-0.5"></i>Clear
                            </button>
                          )}
                          {effectiveQrCodes.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-xs text-danger d-inline-flex align-items-center gap-1 p-0 border-0"
                              style={{ fontSize: '11px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQr(item.id);
                              }}
                              title="Delete this item"
                            >
                              <i className="ti ti-trash"></i>
                              <span>Delete</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-xs d-inline-flex align-items-center gap-1 fw-semibold border-0 text-white"
                            style={{
                              height: '20px',
                              minHeight: '20px',
                              padding: '0 6px',
                              fontSize: '10px',
                              borderRadius: '4px',
                              backgroundColor: '#ea580c',
                              color: '#ffffff',
                              lineHeight: 1,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 1px 2px rgba(234, 88, 12, 0.25)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddQr();
                            }}
                            title="Add another QR / Barcode"
                          >
                            <i className="ti ti-plus" style={{ fontSize: '10px' }}></i>
                            <span>Add QR / Barcode</span>
                          </button>
                        </div>
                      </div>

                      {/* Code Type Selector (QR Code vs Barcode) */}
                      <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                        <span className="text-secondary fw-semibold" style={{ fontSize: '11px' }}>
                          Code Type
                        </span>
                        <div
                          className="d-inline-flex p-0.5 rounded-2 border"
                          style={{ backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', gap: '4px' }}
                        >
                          {[
                            { value: 'qr', label: 'QR Code', icon: 'ti-qrcode' },
                            { value: 'barcode', label: 'Barcode', icon: 'ti-barcode' }
                          ].map((opt) => {
                            const active = (isBarcode ? 'barcode' : 'qr') === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                className={`btn btn-xs fw-semibold d-inline-flex align-items-center gap-1 rounded-1 px-2 py-1 ${
                                  active ? 'bg-white text-dark shadow-2xs' : 'bg-transparent text-secondary border-0'
                                }`}
                                style={{
                                  fontSize: '11px',
                                  border: active ? '1px solid #fed7aa' : '1px solid transparent',
                                  color: active ? '#c2410c' : '#64748b'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (opt.value === 'barcode') {
                                    handleUpdateQrFields(item.id, {
                                      codeType: 'barcode',
                                      widthMm: Math.max(MIN_BARCODE_WIDTH_MM, Number(item.widthMm) || MIN_BARCODE_WIDTH_MM),
                                      heightMm: Math.max(MIN_BARCODE_HEIGHT_MM, Number(item.heightMm) || MIN_BARCODE_HEIGHT_MM),
                                      color: '#0f172a',
                                      bgColor: 'transparent'
                                    });
                                  } else {
                                    handleUpdateQrField(item.id, 'codeType', opt.value);
                                  }
                                }}
                              >
                                <i className={`ti ${opt.icon}`} style={{ color: active ? '#ea580c' : '#64748b', fontSize: '13px' }}></i>
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Prominent Seamless Code Content Input */}
                      <div className="position-relative">
                        <span
                          className="position-absolute top-50 start-0 translate-middle-y ms-2.5 d-flex align-items-center"
                          style={{ pointerEvents: 'none', zIndex: 2 }}
                        >
                          <i className={`ti ${isBarcode ? 'ti-barcode' : 'ti-qrcode'}`} style={{ color: '#ea580c', fontSize: '14px' }}></i>
                        </span>
                        <input
                          type="text"
                          className="form-control font-mono text-xs"
                          style={{
                            height: '34px',
                            paddingLeft: '32px',
                            paddingRight: '12px',
                            backgroundColor: '#ffffff',
                            borderColor: '#e2e8f0',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                          placeholder={isBarcode ? 'Enter barcode content / serial...' : 'Enter QR content / payload...'}
                          value={effectiveVal}
                          onChange={(e) => handleUpdateQrField(item.id, 'value', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* 2. Code Size Controls (mm for Barcode min 40x5.5mm, px for QR Code) */}
                    {isBarcode ? (
                      <div className="mb-3 pt-1 vstack gap-2.5">
                        <div>
                          <label className="text-secondary fw-semibold small mb-1 d-flex align-items-center justify-content-between" style={{ fontSize: '11px' }}>
                            <span>Barcode Width (mm)</span>
                            <span className="text-muted" style={{ fontSize: '10px' }}>Min {MIN_BARCODE_WIDTH_MM} mm</span>
                          </label>
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="range"
                              className="form-range flex-grow-1"
                              min={MIN_BARCODE_WIDTH_MM}
                              max="95"
                              step="1"
                              value={currentWidthMm}
                              onChange={(e) => handleUpdateQrField(item.id, 'widthMm', Math.max(MIN_BARCODE_WIDTH_MM, Number(e.target.value)))}
                              style={{ accentColor: '#ea580c', cursor: 'pointer' }}
                            />
                            <div
                              className="d-flex align-items-center bg-white border rounded shadow-2xs px-1 flex-shrink-0"
                              style={{ height: '30px', width: '95px' }}
                            >
                              <button
                                type="button"
                                className="btn btn-sm btn-link p-0 text-secondary text-decoration-none d-flex align-items-center justify-content-center"
                                style={{ width: '18px', height: '100%' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateQrField(item.id, 'widthMm', Math.max(MIN_BARCODE_WIDTH_MM, currentWidthMm - 1));
                                }}
                                title="Decrease width (-1mm)"
                              >
                                <i className="ti ti-minus" style={{ fontSize: '11px' }}></i>
                              </button>
                              <input
                                type="number"
                                className="form-control form-control-sm border-0 text-center font-mono p-0 fw-bold text-dark flex-grow-1"
                                style={{ minWidth: '24px', fontSize: '12px', background: 'transparent', boxShadow: 'none' }}
                                min={MIN_BARCODE_WIDTH_MM}
                                max="95"
                                step="1"
                                value={currentWidthMm}
                                onChange={(e) => handleUpdateQrField(item.id, 'widthMm', Math.max(MIN_BARCODE_WIDTH_MM, Math.min(95, Number(e.target.value) || MIN_BARCODE_WIDTH_MM)))}
                              />
                              <span className="text-muted pe-1" style={{ fontSize: '10px', userSelect: 'none' }}>mm</span>
                              <button
                                type="button"
                                className="btn btn-sm btn-link p-0 text-secondary text-decoration-none d-flex align-items-center justify-content-center"
                                style={{ width: '18px', height: '100%' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateQrField(item.id, 'widthMm', Math.min(95, currentWidthMm + 1));
                                }}
                                title="Increase width (+1mm)"
                              >
                                <i className="ti ti-plus" style={{ fontSize: '11px' }}></i>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-secondary fw-semibold small mb-1 d-flex align-items-center justify-content-between" style={{ fontSize: '11px' }}>
                            <span>Barcode Height (mm)</span>
                            <span className="text-muted" style={{ fontSize: '10px' }}>Min {MIN_BARCODE_HEIGHT_MM} mm</span>
                          </label>
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="range"
                              className="form-range flex-grow-1"
                              min={MIN_BARCODE_HEIGHT_MM}
                              max="25"
                              step="0.5"
                              value={currentHeightMm}
                              onChange={(e) => handleUpdateQrField(item.id, 'heightMm', Math.max(MIN_BARCODE_HEIGHT_MM, Number(e.target.value)))}
                              style={{ accentColor: '#ea580c', cursor: 'pointer' }}
                            />
                            <div
                              className="d-flex align-items-center bg-white border rounded shadow-2xs px-1 flex-shrink-0"
                              style={{ height: '30px', width: '95px' }}
                            >
                              <button
                                type="button"
                                className="btn btn-sm btn-link p-0 text-secondary text-decoration-none d-flex align-items-center justify-content-center"
                                style={{ width: '18px', height: '100%' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateQrField(item.id, 'heightMm', Math.max(MIN_BARCODE_HEIGHT_MM, Number((currentHeightMm - 0.5).toFixed(1))));
                                }}
                                title="Decrease height (-0.5mm)"
                              >
                                <i className="ti ti-minus" style={{ fontSize: '11px' }}></i>
                              </button>
                              <input
                                type="number"
                                className="form-control form-control-sm border-0 text-center font-mono p-0 fw-bold text-dark flex-grow-1"
                                style={{ minWidth: '24px', fontSize: '12px', background: 'transparent', boxShadow: 'none' }}
                                min={MIN_BARCODE_HEIGHT_MM}
                                max="25"
                                step="0.5"
                                value={currentHeightMm}
                                onChange={(e) => handleUpdateQrField(item.id, 'heightMm', Math.max(MIN_BARCODE_HEIGHT_MM, Math.min(25, Number(e.target.value) || MIN_BARCODE_HEIGHT_MM)))}
                              />
                              <span className="text-muted pe-1" style={{ fontSize: '10px', userSelect: 'none' }}>mm</span>
                              <button
                                type="button"
                                className="btn btn-sm btn-link p-0 text-secondary text-decoration-none d-flex align-items-center justify-content-center"
                                style={{ width: '18px', height: '100%' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateQrField(item.id, 'heightMm', Math.min(25, Number((currentHeightMm + 0.5).toFixed(1))));
                                }}
                                title="Increase height (+0.5mm)"
                              >
                                <i className="ti ti-plus" style={{ fontSize: '11px' }}></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-3 pt-1">
                        <label className="text-secondary fw-semibold small mb-1.5 d-block" style={{ fontSize: '11px' }}>
                          QR Code Size
                        </label>

                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="range"
                            className="form-range flex-grow-1"
                            min="0"
                            max="120"
                            step="2"
                            value={currentSize}
                            onChange={(e) => handleUpdateQrField(item.id, 'size', Number(e.target.value))}
                            style={{ accentColor: '#ea580c', cursor: 'pointer' }}
                          />

                          <div
                            className="d-flex align-items-center bg-white border rounded shadow-2xs px-1 flex-shrink-0"
                            style={{ height: '30px', width: '95px' }}
                          >
                            <button
                              type="button"
                              className="btn btn-sm btn-link p-0 text-secondary text-decoration-none d-flex align-items-center justify-content-center"
                              style={{ width: '18px', height: '100%' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateQrField(item.id, 'size', Math.max(0, currentSize - 4));
                              }}
                              title="Decrease size (-4px)"
                            >
                              <i className="ti ti-minus" style={{ fontSize: '11px' }}></i>
                            </button>
                            <input
                              type="number"
                              className="form-control form-control-sm border-0 text-center font-mono p-0 fw-bold text-dark flex-grow-1"
                              style={{ minWidth: '24px', fontSize: '12px', background: 'transparent', boxShadow: 'none' }}
                              min="0"
                              max="180"
                              value={currentSize}
                              onChange={(e) => handleUpdateQrField(item.id, 'size', Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
                            />
                            <span className="text-muted pe-1" style={{ fontSize: '10px', userSelect: 'none' }}>px</span>
                            <button
                              type="button"
                              className="btn btn-sm btn-link p-0 text-secondary text-decoration-none d-flex align-items-center justify-content-center"
                              style={{ width: '18px', height: '100%' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateQrField(item.id, 'size', Math.min(180, currentSize + 4));
                              }}
                              title="Increase size (+4px)"
                            >
                              <i className="ti ti-plus" style={{ fontSize: '11px' }}></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. Laser Engraving Color Controls */}
                    <div className="pt-1">
                      <label className="text-secondary fw-semibold small mb-1.5 d-block" style={{ fontSize: '11px' }}>
                        Laser Engraving Color
                      </label>
                      <div
                        className="d-flex align-items-center justify-content-between p-1.5 rounded-2 border"
                        style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                      >
                        <div className="d-flex align-items-center gap-1.5">
                          {COLOR_PRESETS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              className="rounded-circle p-0 transition-all"
                              style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: c.value,
                                border: qrColor === c.value ? '2.5px solid #ea580c' : '1px solid #94a3b8',
                                boxShadow: qrColor === c.value ? '0 0 0 2px rgba(234,88,12,0.35)' : 'none',
                                cursor: 'pointer'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateQrField(item.id, 'color', c.value);
                              }}
                              title={c.label}
                            />
                          ))}
                        </div>

                        <label className="m-0 p-0 cursor-pointer d-flex align-items-center gap-1 text-xs text-secondary" title="Pick custom color">
                          <span style={{ fontSize: '10.5px' }}>Custom:</span>
                          <input
                            type="color"
                            value={qrColor}
                            onChange={(e) => handleUpdateQrField(item.id, 'color', e.target.value)}
                            style={{ width: '22px', height: '22px', border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: VARIABLE TEXTS CONFIGURATION ==================== */}
      {activeTab === 'texts' && (
        <div className="bg-white p-3 rounded-3 border" style={{ borderColor: '#e2e8f0' }}>
          {variableTexts.length === 0 ? (
            <div className="text-center py-4 text-muted bg-light rounded border border-dashed">
              <i className="ti ti-typography-off fs-3 text-secondary opacity-50 d-block mb-1"></i>
              <span className="small d-block mb-2">No text labels on meter body.</span>
              <button
                type="button"
                className="btn btn-xs fw-semibold"
                style={{ backgroundColor: '#ea580c', color: '#fff' }}
                onClick={handleAddText}
              >
                <i className="ti ti-plus me-1"></i>Add Variable Text Now
              </button>
            </div>
          ) : (
            <div className="vstack gap-3">
              {variableTexts.map((item) => {
                const isSelected = selectedItem.type === 'text' && selectedItem.id === item.id;
                const textColor = item.color || '#ffffff';
                const currentFontSize = item.fontSize !== undefined && item.fontSize !== null ? item.fontSize : 12;

                return (
                  <div
                    key={item.id}
                    className="rounded-3 border transition-all bg-white p-3"
                    style={{
                      borderColor: isSelected ? '#ea580c' : '#e2e8f0',
                      boxShadow: isSelected
                        ? '0 0 0 3px rgba(234, 88, 12, 0.08), 0 2px 8px rgba(0,0,0,0.04)'
                        : '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                    onClick={() => setSelectedItem({ type: 'text', id: item.id })}
                  >
                    {/* 1. Label Text String Header & Actions */}
                    <div className="mb-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <label className="text-secondary fw-semibold small mb-0" style={{ fontSize: '11px' }}>
                          Text Label
                        </label>
                        <div className="d-flex align-items-center gap-2">
                          {item.text && (
                            <button
                              type="button"
                              className="btn btn-link btn-xs p-0 text-decoration-none fw-semibold"
                              style={{ fontSize: '11px', color: '#ea580c' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateTextField(item.id, 'text', '');
                              }}
                              title="Clear text"
                            >
                              Clear
                            </button>
                          )}
                          {variableTexts.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-xs text-danger d-inline-flex align-items-center gap-1 p-0 border-0"
                              style={{ fontSize: '11px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteText(item.id);
                              }}
                              title="Remove this text label"
                            >
                              <i className="ti ti-trash"></i>
                              <span>Delete</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-xs d-inline-flex align-items-center gap-1 fw-semibold border-0 text-white"
                            style={{
                              height: '20px',
                              minHeight: '20px',
                              padding: '0 6px',
                              fontSize: '10px',
                              borderRadius: '4px',
                              backgroundColor: '#ea580c',
                              color: '#ffffff',
                              lineHeight: 1,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 1px 2px rgba(234, 88, 12, 0.25)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddText();
                            }}
                            title="Add another text label"
                          >
                            <i className="ti ti-plus" style={{ fontSize: '10px' }}></i>
                            <span>Add Text Label</span>
                          </button>
                        </div>
                      </div>

                      {/* Prominent Text Input */}
                      <input
                        type="text"
                        className="form-control form-control-sm font-sans"
                        placeholder="Enter text label on meter body..."
                        value={item.text}
                        onChange={(e) => handleUpdateTextField(item.id, 'text', e.target.value)}
                      />
                    </div>

                    {/* 2. Font Size Controls */}
                    <div className="mb-3 pt-1">
                      <label className="text-secondary fw-semibold small mb-1.5 d-block" style={{ fontSize: '11px' }}>
                        Font Size
                      </label>

                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="range"
                          className="form-range flex-grow-1"
                          min="0"
                          max="36"
                          step="1"
                          value={currentFontSize}
                          onChange={(e) => handleUpdateTextField(item.id, 'fontSize', Number(e.target.value))}
                          style={{ accentColor: '#ea580c', cursor: 'pointer' }}
                        />

                        <div
                          className="d-flex align-items-center bg-white border rounded shadow-2xs px-1 flex-shrink-0"
                          style={{ height: '30px', width: '90px' }}
                        >
                          <button
                            type="button"
                            className="btn btn-sm btn-link p-0 text-secondary text-decoration-none d-flex align-items-center justify-content-center"
                            style={{ width: '18px', height: '100%' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateTextField(item.id, 'fontSize', Math.max(0, currentFontSize - 1));
                            }}
                            title="Decrease font size (-1px)"
                          >
                            <i className="ti ti-minus" style={{ fontSize: '11px' }}></i>
                          </button>
                          <input
                            type="number"
                            className="form-control form-control-sm border-0 text-center font-mono p-0 fw-bold text-dark flex-grow-1"
                            style={{ minWidth: '22px', fontSize: '12px', background: 'transparent', boxShadow: 'none' }}
                            min="0"
                            max="72"
                            value={currentFontSize}
                            onChange={(e) => handleUpdateTextField(item.id, 'fontSize', Math.max(0, Math.min(72, Number(e.target.value) || 0)))}
                          />
                          <span className="text-muted pe-1" style={{ fontSize: '10px', userSelect: 'none' }}>px</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-link p-0 text-secondary text-decoration-none d-flex align-items-center justify-content-center"
                            style={{ width: '18px', height: '100%' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateTextField(item.id, 'fontSize', Math.min(72, currentFontSize + 1));
                            }}
                            title="Increase font size (+1px)"
                          >
                            <i className="ti ti-plus" style={{ fontSize: '11px' }}></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 3. Font Style & Laser Text Color (Horizontal Alignment) */}
                    <div className="pt-1">
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)',
                          gap: '12px',
                          alignItems: 'end'
                        }}
                      >
                        {/* Font Style */}
                        <div>
                          <label className="text-secondary fw-semibold mb-1 d-block" style={{ fontSize: '11px' }}>
                            Font Weight Style
                          </label>
                          <select
                            className="form-select form-select-sm px-2 py-0 fw-medium text-dark bg-white shadow-2xs"
                            style={{ height: '32px', fontSize: '12px' }}
                            value={item.fontWeight || 'bold'}
                            onChange={(e) => handleUpdateTextField(item.id, 'fontWeight', e.target.value)}
                          >
                            <option value="normal">Normal</option>
                            <option value="semibold">SemiBold</option>
                            <option value="bold">Bold (Standard)</option>
                            <option value="bolder">Bolder (Heavy)</option>
                          </select>
                        </div>

                        {/* Laser Text Color */}
                        <div>
                          <label className="text-secondary fw-semibold mb-1 d-block" style={{ fontSize: '11px' }}>
                            Laser Text Color
                          </label>
                          <div
                            className="d-flex align-items-center justify-content-between p-1 rounded-2 border"
                            style={{ height: '32px', backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                          >
                            <div className="d-flex align-items-center gap-1">
                              {COLOR_PRESETS.slice(0, 4).map((c) => (
                                <button
                                  key={c.value}
                                  type="button"
                                  className="rounded-circle p-0 transition-all"
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    backgroundColor: c.value,
                                    border: textColor === c.value ? '2px solid #ea580c' : '1px solid #94a3b8',
                                    boxShadow: textColor === c.value ? '0 0 0 1.5px rgba(234,88,12,0.35)' : 'none',
                                    cursor: 'pointer'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTextField(item.id, 'color', c.value);
                                  }}
                                  title={c.label}
                                />
                              ))}
                            </div>

                            <label className="m-0 p-0 cursor-pointer d-flex align-items-center" title="Pick custom color">
                              <input
                                type="color"
                                value={textColor}
                                onChange={(e) => handleUpdateTextField(item.id, 'color', e.target.value)}
                                style={{ width: '20px', height: '20px', border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ==================== SPLIT LAYOUT MODE ====================
  if (splitLayout || leftTopContent) {
    return (
      <div className="row g-0 w-100 flex-grow-1" style={{ height: '100%', minHeight: 0 }}>
        {/* Left Column: Scrollable form and controls */}
        <div
          className="col-lg-6 col-12 p-3 p-lg-4 border-end"
          style={{
            maxHeight: 'calc(88vh - 65px)',
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#ffffff'
          }}
        >
          {/* Work Order Basic Fields */}
          {leftTopContent}

          {/* Element Controls (Logos, QR Codes, Texts) */}
          {!readOnly && !shouldHideControls && renderControls()}

          {/* Instructions & Submit Actions */}
          {leftBottomContent}
        </div>

        {/* Right Column: Non-scrolling Sticky Meter Body Canvas (100% visible, fully height-constrained) */}
        <div
          className="col-lg-6 col-12 p-2.5 p-lg-3 d-flex flex-column align-items-center justify-content-start bg-light-subtle"
          style={{
            height: 'calc(88vh - 65px)',
            maxHeight: 'calc(88vh - 65px)',
            overflow: 'hidden',
            position: 'sticky',
            top: 0
          }}
        >
          {renderCanvas()}
        </div>
      </div>
    );
  }

  // ==================== DEFAULT STACKED LAYOUT MODE ====================
  return (
    <div className="w-100">
      {renderCanvas()}

      {/* Dragging Help Tip */}
      {!readOnly && !shouldHideControls && (
        <div className="w-100 text-center mt-1.5">
          <small className="text-muted text-xs d-inline-flex align-items-center gap-1">
            <i className="ti ti-hand-drag text-primary"></i>
            <span>Click & drag Logo, QR Code, or Text on the meter image to place anywhere.</span>
          </small>
        </div>
      )}

      {!readOnly && !shouldHideControls && (
        <div className="mt-3">
          {renderControls()}
        </div>
      )}
    </div>
  );
}
