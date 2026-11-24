import React, { createContext, useContext, useState } from 'react';

const HardwareContext = createContext(null);

export function HardwareProvider({ children }) {
  const [activePort, setActivePort] = useState(null);
  const [devicesStatus, setDevicesStatus] = useState({
    serialConnected: false,
    scannerConnected: true,
    printerOnline: false
  });

  return (
    <HardwareContext.Provider value={{ activePort, setActivePort, devicesStatus, setDevicesStatus }}>
      {children}
    </HardwareContext.Provider>
  );
}

export const useHardware = () => useContext(HardwareContext);
