import React from 'react';
import MeterBodyPrintConsole from '../stage09-meter-box-print/MeterBodyPrintConsole';

export default function Stage09PVCSeal(props) {
  return (
    <MeterBodyPrintConsole
      stageId={9}
      stageTitle="Stage 09: Meter Body Print & Optical DLMS Console"
      stationId="Station-09"
      lineType="Main Meter Assembly Line"
      {...props}
    />
  );
}
