import { useRef, forwardRef, useImperativeHandle, useEffect, useState, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

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
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number } | null>(null);
  const hasInitialized = useRef(false);

  // Measure container ONCE on mount with a stable dimension
  // Using a ref flag to ensure we never re-measure (which would clear the canvas)
  useEffect(() => {
    if (hasInitialized.current) return;
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth - 4;
      setCanvasDimensions({ width, height: 128 });
      hasInitialized.current = true;
    }
  }, []);

  useImperativeHandle(ref, () => ({
    clear: () => sigCanvas.current?.clear(),
    isEmpty: () => sigCanvas.current?.isEmpty() ?? true,
    getDataUrl: (type = "image/png", quality = 1) => sigCanvas.current?.toDataURL(type, quality) ?? "",
  }));
  const handleEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      onSave?.(sigCanvas.current.toDataURL("image/png"));
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
      <div
        ref={containerRef}
        className="border-2 border-dashed border-border rounded-xl overflow-hidden bg-white"
        style={canvasDimensions ? { width: canvasDimensions.width + 4, height: canvasDimensions.height } : undefined}
      >
        {canvasDimensions && (
          <SignatureCanvas
            ref={sigCanvas}
            penColor="#1e40af"
            onEnd={handleEnd}
            canvasProps={{
              width: canvasDimensions.width,
              height: canvasDimensions.height,
              className: "touch-none",
              style: { width: `${canvasDimensions.width}px`, height: `${canvasDimensions.height}px` },
            }}
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">Assine dentro da área acima</p>
    </div>
  );
});

SignaturePad.displayName = "SignaturePad";

export default SignaturePad;
