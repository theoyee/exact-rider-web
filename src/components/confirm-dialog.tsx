'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui';
export function ConfirmDialog({ open, title, children, onClose, onConfirm, confirmLabel, busy = false }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void; onConfirm?: () => void; confirmLabel?: string; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (open && !dialog?.open) dialog?.showModal(); else if (!open && dialog?.open) dialog.close(); }, [open]);
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }} className="fixed inset-0 m-auto w-[calc(100%-32px)] max-w-sm rounded-3xl border-0 bg-white p-6 shadow-2xl backdrop:bg-black/45">
    <div className="mb-4 flex items-center justify-between gap-4"><h2 id="dialog-title" className="text-xl font-medium tracking-tight">{title}</h2><button onClick={onClose} disabled={busy} aria-label="Close dialog" className="p-2 text-zinc-400"><X size={20} /></button></div><div className="text-sm leading-6 text-zinc-500">{children}</div><div className="mt-6 grid gap-2">{onConfirm && <Button busy={busy} onClick={onConfirm}>{confirmLabel || 'Confirm'}</Button>}<Button variant="secondary" onClick={onClose} disabled={busy}>{onConfirm ? 'Keep my request' : 'Got it'}</Button></div>
  </dialog>;
}
