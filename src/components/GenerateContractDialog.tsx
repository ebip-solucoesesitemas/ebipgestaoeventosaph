import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Printer } from 'lucide-react';

interface Client {
  id: string;
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cep: string | null;
}

interface ContractTemplate {
  id: string;
  titulo: string;
  conteudo: string;
}

interface Props {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContractSaved?: () => void;
}

function replacePlaceholders(content: string, client: Client, extras: { valor: string; dataInicio: string; dataFim: string }) {
  const today = new Date().toLocaleDateString('pt-BR');
  return content
    .replace(/\{\{CLIENTE_NOME\}\}/g, client.nome || '')
    .replace(/\{\{CLIENTE_DOCUMENTO\}\}/g, client.documento || '')
    .replace(/\{\{CLIENTE_EMAIL\}\}/g, client.email || '')
    .replace(/\{\{CLIENTE_TELEFONE\}\}/g, client.telefone || '')
    .replace(/\{\{CLIENTE_ENDERECO\}\}/g, client.endereco || '')
    .replace(/\{\{CLIENTE_CEP\}\}/g, client.cep || '')
    .replace(/\{\{VALOR_CONTRATO\}\}/g, extras.valor ? Number(extras.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '')
    .replace(/\{\{DATA_INICIO\}\}/g, extras.dataInicio ? new Date(extras.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR') : '')
    .replace(/\{\{DATA_FIM\}\}/g, extras.dataFim ? new Date(extras.dataFim + 'T12:00:00').toLocaleDateString('pt-BR') : '')
    .replace(/\{\{DATA_ATUAL\}\}/g, today);
}

export function GenerateContractDialog({ client, open, onOpenChange, onContractSaved }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [valor, setValor] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [step, setStep] = useState<'select' | 'edit'>('select');
  const [isSaving, setIsSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      supabase.from('contract_templates').select('id, titulo, conteudo').order('titulo').then(({ data }) => {
        setTemplates(data || []);
      });
      setStep('select');
      setSelectedTemplateId('');
      setConteudo('');
      setTitulo('');
      setValor('');
      setDataInicio('');
      setDataFim('');
      setObservacoes('');
    }
  }, [open]);

  const handleGenerate = () => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const filled = replacePlaceholders(template.conteudo, client, { valor, dataInicio, dataFim });
    setConteudo(filled);
    setTitulo(template.titulo + ' — ' + client.nome);
    setStep('edit');
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('client_contracts').insert({
      client_id: client.id,
      template_id: selectedTemplateId || null,
      titulo,
      conteudo,
      valor_contrato: valor ? Number(valor) : 0,
      data_inicio: dataInicio || null,
      data_fim: dataFim || null,
      observacoes: observacoes || null,
      status: 'rascunho',
    });

    setIsSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar contrato', variant: 'destructive' });
    } else {
      toast({ title: 'Contrato salvo com sucesso!' });
      onOpenChange(false);
      onContractSaved?.();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${titulo}</title>
      <style>
        body { font-family: serif; padding: 40px; line-height: 1.8; white-space: pre-wrap; font-size: 14px; }
        @media print { body { padding: 20px; } }
      </style></head>
      <body>${conteudo}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gerar Contrato — {client.nome}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Modelo de Contrato *</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum modelo cadastrado. Vá em Modelos de Contrato para criar um.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Valor do Contrato (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
              </div>
            </div>

            <Button
              className="w-full btn-touch"
              disabled={!selectedTemplateId}
              onClick={handleGenerate}
            >
              Gerar Contrato
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Conteúdo do Contrato (editável)</Label>
              <Textarea
                value={conteudo}
                onChange={e => setConteudo(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações internas</Label>
              <Input
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Notas internas sobre este contrato"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
                Voltar
              </Button>
              <Button variant="outline" onClick={handlePrint} className="gap-1">
                <Printer className="w-4 h-4" /> Imprimir
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 btn-touch">
                {isSaving ? 'Salvando...' : 'Salvar Contrato'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
