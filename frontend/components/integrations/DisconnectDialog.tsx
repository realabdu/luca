'use client';

import { useRef, useEffect } from 'react';

interface DisconnectDialogProps {
  open: boolean;
  platformName: string;
  isDisconnecting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DisconnectDialog({
  open,
  platformName,
  isDisconnecting,
  onConfirm,
  onCancel,
}: DisconnectDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="p-0 shadow-2xl backdrop:bg-black/20 backdrop:backdrop-blur-sm max-w-md w-full m-auto"
      onClose={onCancel}
      onKeyDown={handleKeyDown}
      aria-labelledby="disconnect-dialog-title"
      aria-describedby="disconnect-dialog-description"
    >
      <div className="p-6 bg-white">
        <div className="flex flex-col items-center text-center gap-4 mb-6">
          <div className="size-12 bg-red-50 flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-red-600 text-[24px]" aria-hidden="true">
              link_off
            </span>
          </div>
          <div>
            <h3 id="disconnect-dialog-title" className="text-xl font-bold text-text-main">
              Disconnect Integration?
            </h3>
            <p id="disconnect-dialog-description" className="text-text-muted text-sm mt-2">
              This will stop data syncing from <strong>{platformName}</strong>. You can reconnect
              at any time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 border border-gray-200 bg-white text-text-main text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDisconnecting}
            className="h-11 bg-red-600 text-white text-sm font-bold shadow-sm disabled:opacity-50"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
