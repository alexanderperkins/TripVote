import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// Opens a live connection for one trip and calls handlers[event](payload) for each update.
// onReconnect runs after a dropped connection comes back, so the page can catch up.
// Returns the connection status: connecting | live | reconnecting | unavailable.
export function useTripSocket(tripId, handlers, onReconnect) {
  const [status, setStatus] = useState('connecting');
  const handlersRef = useRef(handlers);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    handlersRef.current = handlers;
    onReconnectRef.current = onReconnect;
  });

  useEffect(() => {
    if (!tripId) return undefined;
    const socket = io({ withCredentials: true });
    let hasConnected = false;

    function handleConnect() {
      const isReconnect = hasConnected;
      hasConnected = true;
      socket.emit('trip:join', tripId, (reply) => {
        if (!reply?.ok) {
          setStatus('unavailable');
          return;
        }
        setStatus('live');
        if (isReconnect) onReconnectRef.current?.();
      });
    }

    function handleDisconnect() {
      setStatus('reconnecting');
    }

    function handleConnectError() {
      setStatus(hasConnected ? 'reconnecting' : 'unavailable');
    }

    const eventListeners = Object.keys(handlersRef.current).map((event) => {
      const listener = (payload) => handlersRef.current[event]?.(payload);
      socket.on(event, listener);
      return [event, listener];
    });
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    return () => {
      eventListeners.forEach(([event, listener]) => socket.off(event, listener));
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.disconnect();
    };
  }, [tripId]);

  return status;
}
