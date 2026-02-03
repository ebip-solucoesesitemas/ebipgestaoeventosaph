import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, Wind, Thermometer, Droplets, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VitalSignsData {
  pa_sistolica: number | null;
  pa_diastolica: number | null;
  frequencia_cardiaca: number | null;
  frequencia_respiratoria: number | null;
  saturacao_o2: number | null;
  temperatura: number | null;
  glicemia: number | null;
}

interface VitalSignsInputProps {
  values: VitalSignsData;
  onChange: (values: VitalSignsData) => void;
}

const getVitalStatus = (type: string, value: number | null) => {
  if (value === null) return 'normal';
  
  switch (type) {
    case 'fc':
      if (value < 60 || value > 100) return value < 50 || value > 120 ? 'critical' : 'warning';
      return 'stable';
    case 'fr':
      if (value < 12 || value > 20) return value < 8 || value > 30 ? 'critical' : 'warning';
      return 'stable';
    case 'spo2':
      if (value < 95) return value < 90 ? 'critical' : 'warning';
      return 'stable';
    case 'temp':
      if (value < 35 || value > 37.5) return value < 34 || value > 39 ? 'critical' : 'warning';
      return 'stable';
    case 'pas':
      if (value < 90 || value > 140) return value < 80 || value > 180 ? 'critical' : 'warning';
      return 'stable';
    case 'glicemia':
      if (value < 70 || value > 180) return value < 50 || value > 250 ? 'critical' : 'warning';
      return 'stable';
    default:
      return 'normal';
  }
};

const statusStyles = {
  stable: 'border-stable/50 bg-stable/5 focus-within:border-stable',
  warning: 'border-warning/50 bg-warning/5 focus-within:border-warning',
  critical: 'border-critical/50 bg-critical/5 focus-within:border-critical animate-pulse-soft',
  normal: 'border-border bg-background focus-within:border-primary',
};

export default function VitalSignsInput({ values, onChange }: VitalSignsInputProps) {
  const updateValue = (key: keyof VitalSignsData, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    onChange({ ...values, [key]: numValue });
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Pressão Arterial */}
      <div className="col-span-2 space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Activity className="w-4 h-4 text-primary" />
          Pressão Arterial (mmHg)
        </Label>
        <div className="flex items-center gap-2">
          <div className={cn('flex-1 rounded-xl border-2 transition-colors', statusStyles[getVitalStatus('pas', values.pa_sistolica)])}>
            <Input
              type="number"
              placeholder="Sistólica"
              value={values.pa_sistolica ?? ''}
              onChange={(e) => updateValue('pa_sistolica', e.target.value)}
              className="border-0 input-touch bg-transparent"
            />
          </div>
          <span className="text-muted-foreground font-medium">/</span>
          <div className={cn('flex-1 rounded-xl border-2 transition-colors', statusStyles[getVitalStatus('pas', values.pa_diastolica)])}>
            <Input
              type="number"
              placeholder="Diastólica"
              value={values.pa_diastolica ?? ''}
              onChange={(e) => updateValue('pa_diastolica', e.target.value)}
              className="border-0 input-touch bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* FC */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Heart className="w-4 h-4 text-critical" />
          FC (bpm)
        </Label>
        <div className={cn('rounded-xl border-2 transition-colors', statusStyles[getVitalStatus('fc', values.frequencia_cardiaca)])}>
          <Input
            type="number"
            placeholder="80"
            value={values.frequencia_cardiaca ?? ''}
            onChange={(e) => updateValue('frequencia_cardiaca', e.target.value)}
            className="border-0 input-touch bg-transparent"
          />
        </div>
      </div>

      {/* FR */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Wind className="w-4 h-4 text-primary" />
          FR (irpm)
        </Label>
        <div className={cn('rounded-xl border-2 transition-colors', statusStyles[getVitalStatus('fr', values.frequencia_respiratoria)])}>
          <Input
            type="number"
            placeholder="16"
            value={values.frequencia_respiratoria ?? ''}
            onChange={(e) => updateValue('frequencia_respiratoria', e.target.value)}
            className="border-0 input-touch bg-transparent"
          />
        </div>
      </div>

      {/* SpO2 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Droplets className="w-4 h-4 text-primary" />
          SpO2 (%)
        </Label>
        <div className={cn('rounded-xl border-2 transition-colors', statusStyles[getVitalStatus('spo2', values.saturacao_o2)])}>
          <Input
            type="number"
            placeholder="98"
            value={values.saturacao_o2 ?? ''}
            onChange={(e) => updateValue('saturacao_o2', e.target.value)}
            className="border-0 input-touch bg-transparent"
          />
        </div>
      </div>

      {/* Temperatura */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Thermometer className="w-4 h-4 text-warning" />
          Temp (°C)
        </Label>
        <div className={cn('rounded-xl border-2 transition-colors', statusStyles[getVitalStatus('temp', values.temperatura)])}>
          <Input
            type="number"
            step="0.1"
            placeholder="36.5"
            value={values.temperatura ?? ''}
            onChange={(e) => updateValue('temperatura', e.target.value)}
            className="border-0 input-touch bg-transparent"
          />
        </div>
      </div>

      {/* Glicemia */}
      <div className="col-span-2 space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Droplets className="w-4 h-4 text-warning" />
          Glicemia (mg/dL)
        </Label>
        <div className={cn('rounded-xl border-2 transition-colors', statusStyles[getVitalStatus('glicemia', values.glicemia)])}>
          <Input
            type="number"
            placeholder="100"
            value={values.glicemia ?? ''}
            onChange={(e) => updateValue('glicemia', e.target.value)}
            className="border-0 input-touch bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}
