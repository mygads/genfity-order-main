"use client";

import React from "react";
import ConfirmDialog from "@/components/modals/ConfirmDialog";

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  variant?: "danger" | "warning" | "info";
  onClose: () => void;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = "OK",
  variant = "info",
  onClose,
}) => {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={title}
      message={message}
      confirmText={confirmText}
      variant={variant}
      hideCancel
      onConfirm={onClose}
      onCancel={onClose}
    />
  );
};

export default AlertDialog;
