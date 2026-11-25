import React from 'react';
import MeterInteractiveTextEditor from '../../../components/stages/stage09-meter-box-print/MeterBodyPrint/MeterInteractiveTextEditor';

export default function Stage09View({ viewingForm }) {
  if (!viewingForm?.print_config) return null;

  return (
    <div className="pb-3 mb-3">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h6 className="fw-bold text-dark mb-0">Laser Marking Template Preview</h6>
        <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-mono text-xs">
          Stage 09
        </span>
      </div>
      <MeterInteractiveTextEditor
        readOnly={true}
        actualPrintOnly={false}
        variableTexts={viewingForm.print_config.variableTexts || []}
        logos={viewingForm.print_config.logos || []}
        qrCodes={viewingForm.print_config.qrCodes || []}
        customLogoUrl={viewingForm.print_config.customLogoUrl}
        logoWidth={viewingForm.print_config.logoWidth}
        logoPos={viewingForm.print_config.logoPos}
        actualPrintImageUrl={viewingForm.print_config.actualPrintImageUrl}
        width={380}
        height={370}
      />
    </div>
  );
}
