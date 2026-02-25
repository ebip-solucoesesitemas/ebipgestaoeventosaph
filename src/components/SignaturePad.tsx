import { useRef, forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  onSave?: (dataUrl: string) => void;
}

export interface SignaturePadRef {
  clear: () => void;
  isEmpty: () => boolean;
  getDataUrl: () => string;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({ label, onSave }, ref) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(300);

  // Measure container once on mount and set fixed canvas dimensions
  // This prevents the canvas from resizing when the mobile keyboard opens
  useEffect(() => {
    if (containerRef.current) {
      setCanvasWidth(containerRef.current.offsetWidth - 4); // subtract border
    }
  }, []);

  useImperativeHandle(ref, () => ({
    clear: () => sigCanvas.current?.clear(),
    isEmpty: () => sigCanvas.current?.isEmpty() ?? true,
    getDataUrl: () => sigCanvas.current?.toDataURL('image/png') ?? '',
  }));

  const handleEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      onSave?.(sigCanvas.current.toDataURL('image/png'));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => sigCanvas.current?.clear()}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <Eraser className="w-4 h-4 mr-1" />
          Limpar
        </Button>
      </div>
      <div ref={containerRef} className="border-2 border-dashed border-border rounded-xl overflow-hidden bg-white">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="#1e40af"
          onEnd={handleEnd}
          canvasProps={{
            width: canvasWidth,
            height: 128,
            className: 'touch-none',
            style: { width: `${canvasWidth}px`, height: '128px' }
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Assine dentro da área acima
      </p>
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
