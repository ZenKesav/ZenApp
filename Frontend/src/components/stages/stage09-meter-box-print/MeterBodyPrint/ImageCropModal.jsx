import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const MIN_CROP_PERCENT = 4;
const MAX_EXPORT_DIM = 2200;

const HANDLES = [
  { key: 'nw', cursor: 'nwse-resize', style: { top: '-5px', left: '-5px' } },
  { key: 'n', cursor: 'ns-resize', style: { top: '-5px', left: '50%', transform: 'translateX(-50%)' } },
  { key: 'ne', cursor: 'nesw-resize', style: { top: '-5px', right: '-5px' } },
  { key: 'e', cursor: 'ew-resize', style: { top: '50%', right: '-5px', transform: 'translateY(-50%)' } },
  { key: 'se', cursor: 'nwse-resize', style: { bottom: '-5px', right: '-5px' } },
  { key: 's', cursor: 'ns-resize', style: { bottom: '-5px', left: '50%', transform: 'translateX(-50%)' } },
  { key: 'sw', cursor: 'nesw-resize', style: { bottom: '-5px', left: '-5px' } },
  { key: 'w', cursor: 'ew-resize', style: { top: '50%', left: '-5px', transform: 'translateY(-50%)' } }
];

/**
 * Interactive Crop Modal for Actual Print uploads (JPG, PNG, or rendered PDF page)
 */
export default function ImageCropModal({
  isOpen,
  imageSrc,
  fileName = '',
  outputMimeType = 'image/png',
  errorMessage = '',
  submitting = false,
  onCancel,
  onConfirm
}) {
  const stageRef = useRef(null);
  const imgRef = useRef(null);

  const [crop, setCrop] = useState({ x: 5, y: 5, w: 90, h: 90 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [dragState, setDragState] = useState(null);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (isOpen && imageSrc) {
      setCrop({ x: 5, y: 5, w: 90, h: 90 });
      setLocalError('');
      const img = imgRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      } else {
        setNaturalSize({ width: 0, height: 0 });
      }
    }
  }, [isOpen, imageSrc]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting && onCancel) {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, submitting, onCancel]);

  const startInteraction = (e, mode) => {
    if (submitting || !stageRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = stageRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;

    setDragState({
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCrop: { ...crop },
      drawAnchorX: Math.max(0, Math.min(100, px)),
      drawAnchorY: Math.max(0, Math.min(100, py))
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragState || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dxPct = ((e.clientX - dragState.startClientX) / rect.width) * 100;
    const dyPct = ((e.clientY - dragState.startClientY) / rect.height) * 100;
    const sc = dragState.startCrop;

    if (dragState.mode === 'move') {
      const nextX = Math.max(0, Math.min(100 - sc.w, sc.x + dxPct));
      const nextY = Math.max(0, Math.min(100 - sc.h, sc.y + dyPct));
      setCrop({ ...sc, x: nextX, y: nextY });
      return;
    }

    if (dragState.mode === 'draw') {
      const curX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const curY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      const x = Math.min(dragState.drawAnchorX, curX);
      const y = Math.min(dragState.drawAnchorY, curY);
      const w = Math.max(MIN_CROP_PERCENT, Math.abs(curX - dragState.drawAnchorX));
      const h = Math.max(MIN_CROP_PERCENT, Math.abs(curY - dragState.drawAnchorY));
      setCrop({
        x: Math.min(x, 100 - MIN_CROP_PERCENT),
        y: Math.min(y, 100 - MIN_CROP_PERCENT),
        w: Math.min(w, 100 - Math.min(x, 100 - MIN_CROP_PERCENT)),
        h: Math.min(h, 100 - Math.min(y, 100 - MIN_CROP_PERCENT))
      });
      return;
    }

    // Resize via 8 handles
    let left = sc.x;
    let top = sc.y;
    let right = sc.x + sc.w;
    let bottom = sc.y + sc.h;

    if (dragState.mode.includes('w')) {
      left = Math.max(0, Math.min(right - MIN_CROP_PERCENT, sc.x + dxPct));
    }
    if (dragState.mode.includes('e')) {
      right = Math.min(100, Math.max(left + MIN_CROP_PERCENT, sc.x + sc.w + dxPct));
    }
    if (dragState.mode.includes('n')) {
      top = Math.max(0, Math.min(bottom - MIN_CROP_PERCENT, sc.y + dyPct));
    }
    if (dragState.mode.includes('s')) {
      bottom = Math.min(100, Math.max(top + MIN_CROP_PERCENT, sc.y + sc.h + dyPct));
    }

    setCrop({
      x: left,
      y: top,
      w: right - left,
      h: bottom - top
    });
  }, [dragState]);

  useEffect(() => {
    if (!dragState) return undefined;
    const onUp = () => setDragState(null);
    const onMoveWrapper = (ev) => {
      handleMouseMove(ev);
    };
    window.addEventListener('pointermove', onMoveWrapper);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('mousemove', onMoveWrapper);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMoveWrapper);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('mousemove', onMoveWrapper);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragState, handleMouseMove]);

  const handleApplyCrop = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) {
      setLocalError('Preview image is still loading. Please wait a moment and try again.');
      return;
    }

    try {
      setLocalError('');
      const sx = Math.max(0, Math.round((crop.x / 100) * img.naturalWidth));
      const sy = Math.max(0, Math.round((crop.y / 100) * img.naturalHeight));
      const sw = Math.max(1, Math.min(img.naturalWidth - sx, Math.round((crop.w / 100) * img.naturalWidth)));
      const sh = Math.max(1, Math.min(img.naturalHeight - sy, Math.round((crop.h / 100) * img.naturalHeight)));

      const scale = Math.min(1, MAX_EXPORT_DIM / Math.max(sw, sh));
      const outW = Math.max(1, Math.round(sw * scale));
      const outH = Math.max(1, Math.round(sh * scale));

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setLocalError('Browser canvas context is unavailable.');
        return;
      }

      const targetMime = outputMimeType === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      if (targetMime === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

      const croppedDataUrl = targetMime === 'image/jpeg'
        ? canvas.toDataURL('image/jpeg', 0.92)
        : canvas.toDataURL('image/png');

      if (!croppedDataUrl || croppedDataUrl === 'data:,') {
        setLocalError('Failed to generate cropped image. Please try adjusting the crop box.');
        return;
      }
      if (onConfirm) onConfirm(croppedDataUrl);
    } catch (err) {
      setLocalError(err?.message || 'Failed to crop selected area.');
    }
  };

  if (!isOpen || !imageSrc) return null;

  const isImageReady = naturalSize.width > 0 || Boolean(imgRef.current?.complete && imgRef.current?.naturalWidth > 0);
  const effectiveNaturalW = naturalSize.width || imgRef.current?.naturalWidth || 0;
  const effectiveNaturalH = naturalSize.height || imgRef.current?.naturalHeight || 0;
  const cropPixelW = effectiveNaturalW ? Math.round((crop.w / 100) * effectiveNaturalW) : 0;
  const cropPixelH = effectiveNaturalH ? Math.round((crop.h / 100) * effectiveNaturalH) : 0;
  const displayError = errorMessage || localError;

  const modalContent = (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 2050
      }}
    >
      <div className="modal-dialog modal-dialog-centered mx-auto p-2 p-sm-0" style={{ maxWidth: '760px', width: '100%' }}>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-white border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2 min-w-0">
              <i className="ti ti-crop fs-5" style={{ color: '#ea580c' }}></i>
              <div className="min-w-0">
                <h5 className="modal-title fs-6 fw-bold text-dark mb-0">Crop Meter Area</h5>
                {fileName && (
                  <div className="text-muted text-truncate" style={{ fontSize: '11px', maxWidth: '460px' }}>
                    {fileName}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              disabled={submitting}
              onClick={onCancel}
              aria-label="Close crop dialog"
            ></button>
          </div>

          <div className="modal-body p-3 bg-light">
            {displayError && (
              <div className="alert alert-danger py-2 px-3 mb-2 d-flex align-items-center gap-2" style={{ fontSize: '12px' }}>
                <i className="ti ti-alert-circle fs-6"></i>
                <span>{displayError}</span>
              </div>
            )}
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2 px-1">
              <span className="text-secondary small" style={{ fontSize: '11.5px' }}>
                Drag corners or edges to cover only the meter area you want to display.
              </span>
              <div className="d-flex align-items-center gap-1.5">
                {cropPixelW > 0 && (
                  <span className="badge bg-white text-dark border font-mono" style={{ fontSize: '10.5px' }}>
                    {cropPixelW} × {cropPixelH} px
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-xs btn-outline-secondary bg-white"
                  style={{ fontSize: '11px' }}
                  disabled={submitting}
                  onClick={() => setCrop({ x: 0, y: 0, w: 100, h: 100 })}
                >
                  Full Area
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-outline-secondary bg-white"
                  style={{ fontSize: '11px' }}
                  disabled={submitting}
                  onClick={() => setCrop({ x: 5, y: 5, w: 90, h: 90 })}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Crop Stage */}
            <div
              className="d-flex align-items-center justify-content-center rounded-3 border bg-dark-subtle p-2"
              style={{ minHeight: '280px', maxHeight: '62vh', overflow: 'hidden' }}
            >
              <div
                ref={stageRef}
                className="position-relative user-select-none"
                style={{ display: 'inline-block', overflow: 'hidden', cursor: 'crosshair', lineHeight: 0, touchAction: 'none' }}
                onPointerDown={(e) => startInteraction(e, 'draw')}
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop Preview"
                  draggable={false}
                  onLoad={(e) => {
                    setLocalError('');
                    setNaturalSize({
                      width: e.currentTarget.naturalWidth,
                      height: e.currentTarget.naturalHeight
                    });
                  }}
                  onError={() => {
                    setLocalError('Failed to load preview image for cropping.');
                  }}
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '58vh',
                    width: 'auto',
                    height: 'auto',
                    pointerEvents: 'none'
                  }}
                />

                {/* Highlighted Crop Box with dimmed outer mask */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${crop.x}%`,
                    top: `${crop.y}%`,
                    width: `${crop.w}%`,
                    height: `${crop.h}%`,
                    border: '2px solid #ea580c',
                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.58)',
                    cursor: 'move',
                    boxSizing: 'border-box',
                    touchAction: 'none'
                  }}
                  onPointerDown={(e) => startInteraction(e, 'move')}
                >
                  {/* Subtle rule-of-thirds guides */}
                  <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: '1px', backgroundColor: 'rgba(255,255,255,0.45)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: '1px', backgroundColor: 'rgba(255,255,255,0.45)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: '1px', backgroundColor: 'rgba(255,255,255,0.45)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: '1px', backgroundColor: 'rgba(255,255,255,0.45)', pointerEvents: 'none' }} />

                  {/* 8 Resize Handles */}
                  {HANDLES.map((h) => (
                    <div
                      key={h.key}
                      onPointerDown={(e) => startInteraction(e, h.key)}
                      style={{
                        position: 'absolute',
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#ffffff',
                        border: '2px solid #ea580c',
                        borderRadius: '2px',
                        cursor: h.cursor,
                        zIndex: 4,
                        touchAction: 'none',
                        ...h.style
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer bg-white border-top px-4 py-2.5 d-flex align-items-center justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-sm btn-light border px-3 fw-medium"
              disabled={submitting}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm fw-semibold text-white px-4 d-inline-flex align-items-center gap-1.5"
              style={{ backgroundColor: '#ea580c', borderColor: '#ea580c' }}
              disabled={submitting || !isImageReady}
              onClick={handleApplyCrop}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="ti ti-check"></i>
                  <span>Crop &amp; Upload</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

