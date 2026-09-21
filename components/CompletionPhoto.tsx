import React, { useEffect, useRef, useState } from 'react';
import { fetchCompletionImage } from '../services/osImages';

interface Props {
  osId: string;
  src?: string | null; // já vem preenchida quando a OS acabou de ser finalizada nesta sessão
}

// Miniatura da evidência de finalização. A foto não vem na listagem de OSs,
// então só é buscada quando o card entra na tela.
const CompletionPhoto: React.FC<Props> = ({ osId, src }) => {
  const [image, setImage] = useState<string | null>(src || null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (src) {
      setImage(src);
      return;
    }

    const el = placeholderRef.current;
    if (!el) return;

    let cancelled = false;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some(e => e.isIntersecting)) return;
      observer.disconnect();
      fetchCompletionImage(osId)
        .then(img => { if (!cancelled) setImage(img); })
        .catch(err => console.error('Erro ao carregar foto da OS:', err));
    }, { rootMargin: '200px' });

    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [osId, src]);

  if (!image) return <div ref={placeholderRef} className="h-px" />;

  return (
    <div className="mt-2 relative">
      <img src={image} alt="Evidência" className="w-full h-32 object-cover rounded-lg border border-slate-200 opacity-80" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm"><i className="fas fa-check-circle text-clean-primary mr-1"></i> Evidência Enviada</span>
      </div>
    </div>
  );
};

export default CompletionPhoto;
