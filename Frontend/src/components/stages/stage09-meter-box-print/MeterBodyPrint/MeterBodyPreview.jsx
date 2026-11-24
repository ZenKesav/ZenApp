import React from 'react';
import meterBodyCADImg from '../../../../assets/images/meter-body.PNG';
import QRCodeSVG from '../../../common/QRCode/QRCodeSVG';
import BarcodeSVG from '../../../common/QRCode/BarcodeSVG';
import { RenderUtilityLogo } from './UtilityLogos';

/**
 * High-Precision Interactive Meter Body Laser Print & Overlay Component
 * Accurately aligns parameters, logos, QR codes, and laser engravings onto the meter casing
 */
export default function MeterBodyPreview({
  config = {},
  isPrinting = false,
  printProgress = 0,
  activeField = null,
  onSelectField = null,
  viewMode = 'cad', // 'cad' | 'actual' | 'laser_only' | 'blueprint'
  scale = 1.0,
  className = ''
}) {
  const {
    logoType = 'zenmeter',
    customLogoUrl = null,
    customLogoText = '',
    logoTagline = 'Redefining Metering Possibilities',
    brandTitle = 'ZenSmart®',
    qrValue = '',
    imei = '865931087398129',
    wanComm = 'WAN Comm. Cellular: 850/900/1800/2100/2300/2500 MHz',
    meterTitle = '1Phase 2 Wire ac Static kWh Smart Meter',
    voltageCurrent = '240V, 10-60A, 50Hz',
    accuracyClass = 'Class-1, 27°C',
    category = 'Cat-D1, W.P.',
    meterType = 'Z1A02FP3',
    propertyOf = "' Sample Meter '",
    loaNo = 'LOA-2026/089',
    pulseConstant = '3200 imp/kWh',
    mfgDate = '05/26',
    serialNo = 'ZG0000022',
    manufacturer = 'Zenmeter Solutions Pvt Ltd., Bangalore, India',
    bisText = 'For details of BIS certification please visit www.bis.gov.in',
    lcdReading = '000124.8',
    workId = 'WORK-STG9-001',
    variableTexts = [],
    logos = null,
    qrCodes = null,
    logoPos = null,
    qrPos = null,
    qrSize = null
  } = config;

  // Auto-generate QR payload if not explicitly set
  const computedQrValue = qrValue || `${workId}|SN:${serialNo}|IMEI:${imei}|TYPE:${meterType}`;

  // Helper for field selection highlight
  const getFieldHighlight = (fieldName) => {
    if (!onSelectField) return {};
    const isSelected = activeField === fieldName;
    return {
      cursor: 'pointer',
      outline: isSelected ? '2px solid #2563eb' : '1px dashed transparent',
      backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
      borderRadius: '2px',
      padding: '1px 3px',
      transition: 'all 0.15s ease'
    };
  };

  // Determine container styling based on viewMode
  let containerBg = 'transparent';
  let bodyFilter = 'none';

  if (viewMode === 'actual') {
    // Simulated off-white/light gray physical polycarbonate casing like Image 1
    containerBg = 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)';
    bodyFilter = 'brightness(1.55) contrast(0.85) grayscale(0.95)';
  } else if (viewMode === 'laser_only') {
    // Pure white backdrop with only laser etched markings
    containerBg = '#ffffff';
    bodyFilter = 'opacity(0.08)';
  } else if (viewMode === 'blueprint') {
    // Blueprint engineering dark grid
    containerBg = '#0f172a';
    bodyFilter = 'hue-rotate(180deg) brightness(0.65) invert(0.8)';
  }

  // Laser marking color scheme
  const textColor = viewMode === 'blueprint' ? '#38bdf8' : '#0f172a';
  const labelBoxBg = viewMode === 'blueprint' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.9)';
  const labelBoxBorder = viewMode === 'blueprint' ? '#38bdf8' : '#334155';

  return (
    <div
      className={`position-relative user-select-none overflow-hidden rounded-3 shadow-sm border ${className}`}
      style={{
        width: '100%',
        maxWidth: '540px',
        margin: '0 auto',
        aspectRatio: '938 / 1010',
        background: containerBg,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
        fontSize: '11px',
        fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      }}
    >
      {/* 1. Master Meter Body Base Image (meter-body.PNG) */}
      <img
        src={meterBodyCADImg}
        alt="Zenmeter Meter Body CAD Master"
        className="w-100 h-100 position-absolute top-0 start-0"
        style={{
          objectFit: 'cover',
          filter: bodyFilter,
          pointerEvents: 'none'
        }}
      />

      {/* Blueprint Grid Overlay (when in blueprint mode) */}
      {viewMode === 'blueprint' && (
        <div
          className="position-absolute w-100 h-100 top-0 start-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.08) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* 2. Top Screws Accent Dots (matching Image 1) */}
      <div
        className="position-absolute"
        style={{
          top: '3.6%',
          left: '5.2%',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #cbd5e1 30%, #64748b 90%)',
          border: '1px solid #475569',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.3)',
          pointerEvents: 'none'
        }}
      />
      <div
        className="position-absolute"
        style={{
          top: '3.6%',
          right: '5.2%',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #cbd5e1 30%, #64748b 90%)',
          border: '1px solid #475569',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.3)',
          pointerEvents: 'none'
        }}
      />

      {/* ========================================================
          3. OVERLAY ELEMENTS (Positioned exactly matching Image 1)
         ======================================================== */}

      {/* Render Logos (Array or Single) */}
      {Array.isArray(logos) ? (
        logos.map((lg, lIdx) => (
          <div
            key={lg.id || lIdx}
            className="position-absolute text-start"
            style={{
              top: lg.topPercent != null ? `${lg.topPercent}%` : '4.2%',
              left: lg.leftPercent != null ? `${lg.leftPercent}%` : '10.5%',
              width: lg.width != null ? `${lg.width}px` : '110px',
              zIndex: 10,
              ...getFieldHighlight('logo')
            }}
            onClick={() => onSelectField && onSelectField('logo')}
            title="Utility Logo"
          >
            {lg.url ? (
              <img src={lg.url} alt="Logo" style={{ width: '100%', maxHeight: '42px', objectFit: 'contain' }} />
            ) : (
              <RenderUtilityLogo logoType={logoType} customLogoUrl={customLogoUrl} customLogoText={customLogoText} />
            )}
          </div>
        ))
      ) : (
        /* Single Logo Fallback */
        <div
          className="position-absolute text-start"
          style={{
            top: logoPos?.topPercent != null ? `${logoPos.topPercent}%` : '4.2%',
            left: logoPos?.leftPercent != null ? `${logoPos.leftPercent}%` : '10.5%',
            width: config.logoWidth ? `${config.logoWidth}px` : '32%',
            zIndex: 10,
            ...getFieldHighlight('logo')
          }}
          onClick={() => onSelectField && onSelectField('logo')}
          title="Utility / OEM Logo & Tagline (Click to Edit)"
        >
          <RenderUtilityLogo
            logoType={logoType}
            customLogoUrl={customLogoUrl}
            customLogoText={customLogoText}
          />
          <div
            className="fw-bold mt-0.5"
            style={{
              fontSize: '7.5px',
              color: viewMode === 'blueprint' ? '#93c5fd' : '#334155',
              letterSpacing: '0.1px',
              lineHeight: 1.15
            }}
          >
            {logoTagline}
          </div>
        </div>
      )}

      {/* Dynamic User-Positioned Variable Texts */}
      {Array.isArray(variableTexts) && variableTexts.map((vt, vIdx) => (
        <div
          key={vt.id || vIdx}
          className="position-absolute"
          style={{
            top: (vt.topPercent != null ? vt.topPercent + '%' : '10%'),
            left: (vt.leftPercent != null ? vt.leftPercent + '%' : '20%'),
            fontSize: (vt.fontSize != null ? vt.fontSize : 13) + 'px',
            fontWeight: vt.fontWeight || 'bold',
            color: vt.color || textColor,
            zIndex: 15,
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
            textShadow: viewMode === 'blueprint' ? '0 0 2px rgba(56, 189, 248, 0.4)' : 'none'
          }}
          title={'Variable Text: ' + vt.text}
        >
          {vt.text}
        </div>
      ))}

      {/* Top Right: Brand Title & QR Code */}
      <div
        className="position-absolute text-end"
        style={{
          top: '4.4%',
          right: '11.0%',
          zIndex: 10,
          ...getFieldHighlight('brandTitle')
        }}
        onClick={() => onSelectField && onSelectField('brandTitle')}
        title="Sub-brand Title (Click to Edit)"
      >
        <span
          className="fw-bolder"
          style={{
            fontSize: '15px',
            color: textColor,
            letterSpacing: '0.4px',
            fontFamily: 'system-ui, sans-serif'
          }}
        >
          {brandTitle}
        </span>
      </div>

      {/* Render QR / Barcodes (Array or Single) */}
      {Array.isArray(qrCodes) ? (
        qrCodes.map((q, qIdx) => {
          const isBarcode = q.codeType === 'barcode' || q.type === 'barcode';
          const baseSize = q.size != null ? q.size : 58;
          const barcodeWidthMm = Math.max(40, Number(q.widthMm) || 40);
          const barcodeHeightMm = Math.max(5.5, Number(q.heightMm) || 5.5);
          const barcodeWidthPx = Math.round(barcodeWidthMm * 4);
          const barcodeHeightPx = Math.round(barcodeHeightMm * 4);
          const activeColor = q.color || (isBarcode ? '#0f172a' : textColor);
          const effectiveBg = 'transparent';
          return (
            <div
              key={q.id || qIdx}
              className="position-absolute"
              style={{
                top: q.topPercent != null ? `${q.topPercent}%` : '12.8%',
                left: q.leftPercent != null ? `${q.leftPercent}%` : '72%',
                zIndex: 10,
                ...getFieldHighlight('qr')
              }}
              onClick={() => onSelectField && onSelectField('qr')}
              title={`Laser ${isBarcode ? 'Barcode' : 'QR Code'}: ${q.value || computedQrValue}`}
            >
              <div className="d-inline-block" style={{ background: effectiveBg }}>
                {isBarcode ? (
                  <BarcodeSVG
                    value={q.value || computedQrValue}
                    width={barcodeWidthPx}
                    height={barcodeHeightPx}
                    color={activeColor}
                    bgColor={effectiveBg}
                  />
                ) : (
                  <QRCodeSVG
                    value={q.value || computedQrValue}
                    size={baseSize}
                    color={activeColor}
                    bgColor={effectiveBg}
                  />
                )}
              </div>
            </div>
          );
        })
      ) : (
        /* Single QR Code Fallback */
        <div
          className="position-absolute"
          style={{
            top: qrPos?.topPercent != null ? `${qrPos.topPercent}%` : '12.8%',
            left: qrPos?.leftPercent != null ? `${qrPos.leftPercent}%` : undefined,
            right: qrPos?.leftPercent != null ? undefined : '10.2%',
            zIndex: 10,
            ...getFieldHighlight('qr')
          }}
          onClick={() => onSelectField && onSelectField('qr')}
          title={`Dynamic Laser QR Code: ${computedQrValue} (Click to Edit)`}
        >
          <div className="d-inline-block" style={{ background: 'transparent' }}>
            <QRCodeSVG value={computedQrValue} size={qrSize || 68} color={textColor} bgColor="transparent" />
          </div>
        </div>
      )}

      {/* Top Center: Tx/Rx & Err LED Labels */}
      <div
        className="position-absolute text-center"
        style={{
          top: '16.0%',
          left: '42.0%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}
      >
        <span
          className="fw-bold font-mono"
          style={{ fontSize: '9px', color: textColor, letterSpacing: '0.3px' }}
        >
          Tx/Rx
        </span>
      </div>
      <div
        className="position-absolute text-center"
        style={{
          top: '16.0%',
          left: '52.4%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}
      >
        <span
          className="fw-bold font-mono"
          style={{ fontSize: '9px', color: textColor, letterSpacing: '0.3px' }}
        >
          Err
        </span>
      </div>

      {/* Top Center: IMEI & WAN Cellular Specifications */}
      <div
        className="position-absolute text-center w-75"
        style={{
          top: '21.4%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          ...getFieldHighlight('imei')
        }}
        onClick={() => onSelectField && onSelectField('imei')}
        title="Cellular Modem IMEI Number (Click to Edit)"
      >
        <div
          className="fw-bolder font-mono"
          style={{
            fontSize: '15px',
            color: textColor,
            letterSpacing: '1.2px',
            lineHeight: 1.2
          }}
        >
          IMEI : {imei}
        </div>
        <div
          className="fw-semibold mt-0.5"
          style={{
            fontSize: '8.5px',
            color: viewMode === 'blueprint' ? '#93c5fd' : '#1e293b',
            letterSpacing: '0.2px'
          }}
        >
          {wanComm}
        </div>
      </div>

      {/* Center Title above LCD Window */}
      <div
        className="position-absolute text-center w-75"
        style={{
          top: '42.4%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          ...getFieldHighlight('meterTitle')
        }}
        onClick={() => onSelectField && onSelectField('meterTitle')}
        title="Meter Specification Title (Click to Edit)"
      >
        <span
          className="fw-bolder"
          style={{
            fontSize: '11px',
            color: textColor,
            letterSpacing: '0.4px',
            fontFamily: 'system-ui, sans-serif'
          }}
        >
          {meterTitle}
        </span>
      </div>

      {/* LCD Window Area (Over the exact CAD rectangular cutout) */}
      <div
        className="position-absolute rounded-1 overflow-hidden"
        style={{
          top: '47.4%',
          left: '27.4%',
          width: '44.0%',
          height: '18.4%',
          zIndex: 8,
          background: 'linear-gradient(145deg, #788f80 0%, #627769 100%)',
          border: '2px solid #334155',
          boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '6px 8px',
          color: '#1a2e22',
          fontFamily: "'Courier New', Courier, monospace"
        }}
      >
        {/* LCD Status Header */}
        <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '7.5px', opacity: 0.85, fontWeight: 'bold' }}>
          <span>📶 SIM1 &bull; 4G</span>
          <span>⚡ L1 RELAY ON</span>
          <span>🔋 3.6V</span>
        </div>

        {/* Big 7-Segment Digital Meter Reading */}
        <div className="d-flex align-items-baseline justify-content-end gap-1.5 my-auto">
          <span
            style={{
              fontSize: '22px',
              fontWeight: '900',
              letterSpacing: '2.5px',
              color: '#0f2415',
              textShadow: '0 1px 0 rgba(255,255,255,0.2)'
            }}
          >
            {lcdReading}
          </span>
          <span className="fw-bolder" style={{ fontSize: '11px', color: '#132b1a' }}>
            kWh
          </span>
        </div>

        {/* LCD Status Footer */}
        <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '7px', opacity: 0.8, fontWeight: 'bold' }}>
          <span>V: 239.8V</span>
          <span>I: 14.2A</span>
          <span>PF: 0.99</span>
          <span>AUTO MD</span>
        </div>

        {/* Subtle glass reflection across LCD */}
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Left of LCD: Symbols & Electrical Ratings */}
      <div
        className="position-absolute text-start"
        style={{
          top: '46.0%',
          left: '7.8%',
          width: '18.5%',
          zIndex: 10
        }}
      >
        {/* Connection & Class II symbols */}
        <div className="d-flex align-items-center gap-2 mb-1.5" style={{ color: textColor }}>
          {/* Circuit symbol: -o o- */}
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>⚬——⚬</span>
          {/* Square in Square (Class II double insulation) */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '12px',
              height: '12px',
              border: `1.5px solid ${textColor}`,
              position: 'relative'
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                border: `1.2px solid ${textColor}`
              }}
            />
          </span>
        </div>

        {/* Boxed Voltage & Current Rating */}
        <div
          className="fw-bold mb-1"
          style={{
            fontSize: '8.5px',
            color: textColor,
            border: `1px solid ${labelBoxBorder}`,
            backgroundColor: labelBoxBg,
            padding: '1.5px 3px',
            borderRadius: '2px',
            display: 'inline-block',
            lineHeight: 1.15,
            ...getFieldHighlight('voltageCurrent')
          }}
          onClick={() => onSelectField && onSelectField('voltageCurrent')}
          title="Voltage & Current Rating (Click to Edit)"
        >
          {voltageCurrent}
        </div>

        {/* Class and Temp */}
        <div
          className="fw-semibold mb-0.5"
          style={{
            fontSize: '8px',
            color: textColor,
            lineHeight: 1.2,
            ...getFieldHighlight('accuracyClass')
          }}
          onClick={() => onSelectField && onSelectField('accuracyClass')}
          title="Accuracy Class & Reference Temperature (Click to Edit)"
        >
          {accuracyClass}
        </div>

        {/* Category */}
        <div
          className="fw-semibold mb-1"
          style={{
            fontSize: '8px',
            color: textColor,
            lineHeight: 1.2,
            ...getFieldHighlight('category')
          }}
          onClick={() => onSelectField && onSelectField('category')}
          title="Environmental Category (Click to Edit)"
        >
          {category}
        </div>

        {/* Boxed Meter Type / Model */}
        <div
          className="fw-bolder mb-1.5"
          style={{
            fontSize: '8.5px',
            color: textColor,
            border: `1px solid ${labelBoxBorder}`,
            backgroundColor: labelBoxBg,
            padding: '1.5px 3px',
            borderRadius: '2px',
            display: 'inline-block',
            lineHeight: 1.15,
            ...getFieldHighlight('meterType')
          }}
          onClick={() => onSelectField && onSelectField('meterType')}
          title="Meter Model / Type (Click to Edit)"
        >
          Type : {meterType}
        </div>

        {/* Property of */}
        <div
          className="fw-semibold"
          style={{
            fontSize: '7.5px',
            color: textColor,
            lineHeight: 1.2,
            ...getFieldHighlight('propertyOf')
          }}
          onClick={() => onSelectField && onSelectField('propertyOf')}
          title="Ownership Notice (Click to Edit)"
        >
          Property of: {propertyOf}
        </div>

        {/* LOA No */}
        <div
          className="fw-semibold mt-0.5"
          style={{
            fontSize: '7.5px',
            color: textColor,
            lineHeight: 1.2,
            ...getFieldHighlight('loaNo')
          }}
          onClick={() => onSelectField && onSelectField('loaNo')}
          title="Letter of Award (LOA) Number (Click to Edit)"
        >
          LOA No.: {loaNo}
        </div>
      </div>

      {/* Right of LCD: Phase LED label */}
      <div
        className="position-absolute text-start"
        style={{
          top: '45.4%',
          right: '16.8%',
          zIndex: 10
        }}
      >
        <span className="fw-bold" style={{ fontSize: '8.5px', color: textColor }}>
          Phase
        </span>
      </div>

      {/* Right of LCD: Push Button Label SC/BT */}
      <div
        className="position-absolute text-center"
        style={{
          top: '59.2%',
          right: '14.0%',
          zIndex: 10
        }}
      >
        <span className="fw-bolder" style={{ fontSize: '9px', color: textColor, letterSpacing: '0.5px' }}>
          SC/BT
        </span>
      </div>

      {/* Right of LCD: Units UC1 / kWh / kVAh */}
      <div
        className="position-absolute text-start lh-1"
        style={{
          top: '57.0%',
          left: '72.2%',
          zIndex: 10
        }}
      >
        <div className="fw-semibold mb-0.5" style={{ fontSize: '7px', color: textColor }}>UC1</div>
        <div className="fw-semibold mb-0.5" style={{ fontSize: '7px', color: textColor }}>kWh</div>
        <div className="fw-semibold" style={{ fontSize: '7px', color: textColor }}>kVAh</div>
      </div>

      {/* Right of Optical Port: Com. label */}
      <div
        className="position-absolute text-center"
        style={{
          top: '90.2%',
          right: '9.5%',
          zIndex: 10
        }}
      >
        <span className="fw-bold" style={{ fontSize: '8.5px', color: textColor }}>
          Com.
        </span>
      </div>

      {/* Below LCD: Pulse Calibration LED 3200 imp/kWh */}
      <div
        className="position-absolute"
        style={{
          top: '70.4%',
          left: '41.0%',
          zIndex: 10,
          ...getFieldHighlight('pulseConstant')
        }}
        onClick={() => onSelectField && onSelectField('pulseConstant')}
        title="Calibration Pulse Constant (Click to Edit)"
      >
        <span
          className="fw-bold"
          style={{
            fontSize: '9px',
            color: textColor,
            border: `1px solid ${labelBoxBorder}`,
            backgroundColor: labelBoxBg,
            padding: '1.5px 4px',
            borderRadius: '2px',
            display: 'inline-block'
          }}
        >
          {pulseConstant}
        </span>
      </div>

      {/* Below LCD: Manufacturing Date MM / YY */}
      <div
        className="position-absolute"
        style={{
          top: '80.0%',
          left: '23.0%',
          zIndex: 10,
          ...getFieldHighlight('mfgDate')
        }}
        onClick={() => onSelectField && onSelectField('mfgDate')}
        title="Manufacturing Date MM/YY (Click to Edit)"
      >
        <span
          className="fw-bold font-mono"
          style={{
            fontSize: '10px',
            color: textColor,
            border: `1px solid ${labelBoxBorder}`,
            backgroundColor: labelBoxBg,
            padding: '1.5px 6px',
            borderRadius: '2px',
            letterSpacing: '0.5px'
          }}
        >
          MM / YY- {mfgDate}
        </span>
      </div>

      {/* Below LCD: Serial Number S/N */}
      <div
        className="position-absolute"
        style={{
          top: '84.4%',
          left: '23.0%',
          zIndex: 10,
          ...getFieldHighlight('serialNo')
        }}
        onClick={() => onSelectField && onSelectField('serialNo')}
        title="Meter Unique Serial Number (Click to Edit)"
      >
        <span
          className="fw-bolder font-mono"
          style={{
            fontSize: '15px',
            color: textColor,
            letterSpacing: '1.2px'
          }}
        >
          S/N: {serialNo}
        </span>
      </div>

      {/* Bottom Footer: Manufacturer & BIS Certification */}
      <div
        className="position-absolute text-center w-75"
        style={{
          top: '93.0%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          ...getFieldHighlight('manufacturer')
        }}
        onClick={() => onSelectField && onSelectField('manufacturer')}
        title="Manufacturer & BIS Details (Click to Edit)"
      >
        <div
          className="fw-semibold"
          style={{
            fontSize: '8.5px',
            color: textColor,
            lineHeight: 1.2
          }}
        >
          {manufacturer}
        </div>
        <div
          className="mt-0.5"
          style={{
            fontSize: '7.5px',
            color: viewMode === 'blueprint' ? '#93c5fd' : '#475569',
            lineHeight: 1.2
          }}
        >
          {bisText}
        </div>
      </div>

      {/* ========================================================
          4. LASER ENGRAVING SIMULATION OVERLAY
         ======================================================== */}
      {isPrinting && (
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            zIndex: 30,
            background: 'rgba(0, 0, 0, 0.25)',
            pointerEvents: 'none'
          }}
        >
          {/* Laser Sweep Horizontal Beam */}
          <div
            className="position-absolute w-100"
            style={{
              top: `${printProgress}%`,
              left: 0,
              height: '3px',
              backgroundColor: '#00ffff',
              boxShadow: '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 35px #3b82f6',
              transition: 'top 0.1s linear'
            }}
          >
            {/* Focal Laser Engraving Spot */}
            <div
              className="position-absolute"
              style={{
                left: `${(printProgress * 3.7) % 85 + 7}%`,
                top: '-4px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                boxShadow: '0 0 12px #ff0055, 0 0 25px #ff0055',
                transform: 'scale(1.2)'
              }}
            />
          </div>

          {/* Progress Banner */}
          <div
            className="position-absolute bottom-0 start-0 w-100 py-2 px-3 d-flex align-items-center justify-content-between text-white"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(4px)',
              borderTop: '1px solid #00ffff'
            }}
          >
            <div className="d-flex align-items-center gap-2 font-mono small">
              <span className="spinner-grow spinner-grow-sm text-info"></span>
              <span>LASER ENGRAVING FRONT HOUSING...</span>
            </div>
            <span className="badge bg-info text-dark font-mono fw-bold fs-6">
              {Math.round(printProgress)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

