import { useRef, forwardRef, useImperativeHandle } from 'react';
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

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({ label }, ref) => {
  const sigCanvas = useRef<SignatureCanvas>(null);

  useImperativeHandle(ref, () => ({
    clear: () => sigCanvas.current?.clear(),
    isEmpty: () => sigCanvas.current?.isEmpty() ?? true,
    getDataUrl: () => sigCanvas.current?.toDataURL('image/png') ?? '',
  }));

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
      <div className="border-2 border-dashed border-border rounded-xl overflow-hidden bg-white">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="#1e40af"
          canvasProps={{
            className: 'w-full h-32 touch-none',
            style: { width: '100%', height: '128px' }
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
