import { useContext } from 'react';
import { ToastContext } from './toastContext.js';

// Returns showToast(message, { actionLabel, onAction, duration }).
export function useToast() {
  return useContext(ToastContext);
}
