import React from 'react';
import MeterBodyPrintConsole from './MeterBodyPrintConsole';
import { useAuth } from '../../../core/context/AuthContext';

export default function Stage09Page(props) {
  const { user } = useAuth();

  return (
    <MeterBodyPrintConsole
      stageId={9}
      stageTitle="Meter Box Body Print"
      lineType="Production"
      stationId="Station-09"
      user={user}
      {...props}
    />
  );
}
