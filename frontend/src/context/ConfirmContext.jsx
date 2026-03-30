import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

const defaultOptions = {
  title: "",
  description: "",
  confirmText: "Ya",
  cancelText: "Batal",
  variant: "default",
};

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(defaultOptions);
  const resolveRef = useRef(null);
  const settledRef = useRef(false);

  const finish = useCallback((value) => {
    if (settledRef.current) return;
    settledRef.current = true;
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setOpen(false);
    resolve?.(value);
    queueMicrotask(() => {
      settledRef.current = false;
    });
  }, []);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      settledRef.current = false;
      resolveRef.current = resolve;
      setOptions({ ...defaultOptions, ...opts });
      setOpen(true);
    });
  }, []);

  const handleOpenChange = (next) => {
    if (!next) finish(false);
  };

  const confirmBtnClass =
    options.variant === "destructive"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-blue-600 text-white hover:bg-blue-700";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent onPointerDownOutside={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title}</AlertDialogTitle>
            <AlertDialogDescription
              className={options.description ? undefined : "sr-only"}
            >
              {options.description || "Konfirmasi tindakan"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">{options.cancelText}</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className={confirmBtnClass}
              onClick={() => finish(true)}
            >
              {options.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx.confirm;
}
