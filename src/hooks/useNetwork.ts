import { useState, useEffect } from 'react';
import { Network, ConnectionStatus } from '@capacitor/network';
import { toast } from 'sonner';

export const useNetwork = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const checkStatus = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
      setConnectionType(status.connectionType);
    };

    checkStatus();

    const listener = Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
      const wasOnline = isOnline;
      setIsOnline(status.connected);
      setConnectionType(status.connectionType);

      if (!wasOnline && status.connected) {
        toast.success('Back online');
      } else if (wasOnline && !status.connected) {
        toast.error('No internet connection');
      }
    });

    return () => {
      listener.then(handle => handle.remove());
    };
  }, [isOnline]);

  return {
    isOnline,
    connectionType,
  };
};
