
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  children: React.ReactNode;
}

const ModalPortal: React.FC<Props> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Bloqueia o scroll do body para evitar rolagem dupla
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(children, document.body);
};

export default ModalPortal;
