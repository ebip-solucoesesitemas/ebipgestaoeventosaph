import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Printer, Edit, Trash2, Eye } from 'lucide-react';
import DOMPurify from 'dompurify';

interface Contract {
  id: string;
  titulo: string;
  conteudo: string;
  status: string;
  valor_contrato: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  observacoes: string | null;
  created_at: string | null;
}

interface Props {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  encerrado: 'Encerrado',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  rascunho: 'secondary',
  ativo: 'default',
  encerrado: 'outline',
  cancelado: 'destructive',
};

export function ClientContractsList({ clientId, clientName, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editData, setEditData] = useState({ titulo: '', conteudo: '', status: '', observacoes: '' });

  const fetchContracts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('client_contracts')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (!error) setContracts(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    if (open) fetchContracts();
  }, [open, clientId]);

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setEditData({
      titulo: contract.titulo,
      conteudo: contract.conteudo,
      status: contract.status,
      observacoes: contract.observacoes || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingContract) return;
    const { error } = await supabase
      .from('client_contracts')
      .update({
        titulo: editData.titulo,
        conteudo: editData.conteudo,
        status: editData.status,
        observacoes: editData.observacoes || null,
      })
      .eq('id', editingContract.id);

    if (error) {
      toast({ title: 'Erro ao atualizar contrato', variant: 'destructive' });
    } else {
      toast({ title: 'Contrato atualizado!' });
      setEditingContract(null);
      fetchContracts();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este contrato?')) return;
    const { error } = await supabase.from('client_contracts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir contrato', variant: 'destructive' });
    } else {
      toast({ title: 'Contrato excluído!' });
      fetchContracts();
    }
  };

  const handlePrint = (contract: Contract) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${contract.titulo}</title>
      <style>
        body { font-family: serif; padding: 40px; line-height: 1.8; white-space: pre-wrap; font-size: 14px; }
        @media print { body { padding: 20px; } }
      </style></head>
      <body>${DOMPurify.sanitize(contract.conteudo)}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <Dialog open={open && !editingContract} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Contratos — {clientName}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : contracts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum contrato gerado para este cliente.</p>
          ) : (
            <div className="space-y-3">
              {contracts.map((c) => (
                <div key={c.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{c.titulo}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Badge variant={statusColors[c.status] as any}>{statusLabels[c.status] || c.status}</Badge>
                        {c.valor_contrato ? (
                          <span>
                            {Number(c.valor_contrato).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        ) : null}
                        {c.created_at && (
                          <span>{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handlePrint(c)} title="Imprimir">
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} title="Editar">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} title="Excluir" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editingContract && (
        <Dialog open={!!editingContract} onOpenChange={(o) => { if (!o) setEditingContract(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Contrato</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={editData.titulo} onChange={(e) => setEditData({ ...editData, titulo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="encerrado">Encerrado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea
                  value={editData.conteudo}
                  onChange={(e) => setEditData({ ...editData, conteudo: e.target.value })}
                  className="min-h-[350px] font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Input value={editData.observacoes} onChange={(e) => setEditData({ ...editData, observacoes: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingContract(null)} className="flex-1">Cancelar</Button>
                <Button variant="outline" onClick={() => handlePrint(editingContract)} className="gap-1">
                  <Printer className="w-4 h-4" /> Imprimir
                </Button>
                <Button onClick={handleSaveEdit} className="flex-1 btn-touch">Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
