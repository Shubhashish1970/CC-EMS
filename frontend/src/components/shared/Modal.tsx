import React, { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full ${sizeStyles[size]} bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-lg font-black text-slate-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;

