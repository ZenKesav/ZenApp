import React from 'react';
import MeterBodyPrintConsole from './MeterBodyPrintConsole';

export default function Stage07MeterPrint(props) {
  return (
    <MeterBodyPrintConsole
      stageId={props.stageId || 7}
      stageTitle={props.stageTitle || ''}
      lineType={props.lineType || ''}
      stationId={props.stationId || ''}
      user={props.user}
      {...props}
    />
  );
}

export { MeterBodyPrintConsole };

