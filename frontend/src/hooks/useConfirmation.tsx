"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function useConfirmation() {
  const [message, setMessage] = useState<string | null>(null);
  const resolve = useRef<((accepted: boolean) => void) | null>(null);
  useEffect(() => () => { resolve.current?.(false); resolve.current = null; }, []);
  const confirmAction = useCallback((text: string): Promise<boolean> => {
    resolve.current?.(false);
    setMessage(text);
    return new Promise<boolean>(done => { resolve.current = done; });
  }, []);
  const close = (accepted: boolean) => {
    const done = resolve.current;
    resolve.current = null;
    setMessage(null);
    done?.(accepted);
  };
  const confirmationDialog = <Dialog open={message !== null} onOpenChange={open => { if (!open) close(false); }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{message}</DialogTitle></DialogHeader><div className="mt-3 flex flex-col gap-3 sm:flex-row"><Button className="min-h-11 sm:flex-1" onClick={() => close(true)}>Confirmar</Button><Button autoFocus className="min-h-11 sm:flex-1" variant="outline" onClick={() => close(false)}>Cancelar</Button></div></DialogContent></Dialog>;
  return { confirmAction, confirmationDialog };
}
