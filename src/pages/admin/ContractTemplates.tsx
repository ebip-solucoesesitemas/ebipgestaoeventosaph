import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, FileText, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ContractTemplate {
  id: string;
  titulo: string;
  conteudo: string;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

const PLACEHOLDERS = [
  { tag: '{{CLIENTE_NOME}}', desc: 'Nome/Razão Social do cliente' },
  { tag: '{{CLIENTE_DOCUMENTO}}', desc: 'CNPJ/CPF do cliente' },
  { tag: '{{CLIENTE_EMAIL}}', desc: 'Email do cliente' },
  { tag: '{{CLIENTE_TELEFONE}}', desc: 'Telefone do cliente' },
  { tag: '{{CLIENTE_ENDERECO}}', desc: 'Endereço do cliente' },
  { tag: '{{CLIENTE_CEP}}', desc: 'CEP do cliente' },
  { tag: '{{VALOR_CONTRATO}}', desc: 'Valor do contrato' },
  { tag: '{{DATA_INICIO}}', desc: 'Data de início' },
  { tag: '{{DATA_FIM}}', desc: 'Data de término' },
  { tag: '{{DATA_ATUAL}}', desc: 'Data atual da geração' },
];

export default function ContractTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    descricao: '',
  });

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao carregar modelos', variant: 'destructive' });
    } else {
      setTemplates(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      titulo: formData.titulo,
      conteudo: formData.conteudo,
      descricao: formData.descricao || null,
    };

    if (editingTemplate) {
      const { error } = await supabase
        .from('contract_templates')
        .update(payload)
        .eq('id', editingTemplate.id);
      if (error) {
        toast({ title: 'Erro ao atualizar modelo', variant: 'destructive' });
      } else {
        toast({ title: 'Modelo atualizado!' });
      }
    } else {
      const { error } = await supabase.from('contract_templates').insert(payload);
      if (error) {
        toast({ title: 'Erro ao criar modelo', variant: 'destructive' });
      } else {
        toast({ title: 'Modelo criado!' });
      }
    }

    setIsDialogOpen(false);
    setEditingTemplate(null);
    setFormData({ titulo: '', conteudo: '', descricao: '' });
    fetchTemplates();
  };

  const handleEdit = (t: ContractTemplate) => {
    setEditingTemplate(t);
    setFormData({ titulo: t.titulo, conteudo: t.conteudo, descricao: t.descricao || '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este modelo de contrato?')) return;
    const { error } = await supabase.from('contract_templates').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir modelo', variant: 'destructive' });
    } else {
      toast({ title: 'Modelo excluído!' });
      fetchTemplates();
    }
  };

  const insertPlaceholder = (tag: string) => {
    setFormData(prev => ({ ...prev, conteudo: prev.conteudo + tag }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Modelos de Contrato</h1>
          <p className="text-muted-foreground">Crie e gerencie modelos reutilizáveis</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="btn-touch gap-2"
              onClick={() => {
                setEditingTemplate(null);
                setFormData({ titulo: '', conteudo: '', descricao: '' });
              }}
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Novo Modelo</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Modelo' : 'Novo Modelo de Contrato'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título do Modelo *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Contrato de Prestação de Serviço APH"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Breve descrição do modelo"
                />
              </div>

              {/* Placeholder helper */}
              <Card className="border-dashed">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Variáveis disponíveis (clique para inserir)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDERS.map((p) => (
                      <Badge
                        key={p.tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                        onClick={() => insertPlaceholder(p.tag)}
                        title={p.desc}
                      >
                        {p.tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="conteudo">Conteúdo do Contrato *</Label>
                <Textarea
                  id="conteudo"
                  value={formData.conteudo}
                  onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                  placeholder="Digite o contrato aqui. Use as variáveis acima para dados automáticos do cliente..."
                  className="min-h-[400px] font-mono text-sm"
                  required
                />
              </div>
              <Button type="submit" className="w-full btn-touch">
                {editingTemplate ? 'Salvar Alterações' : 'Criar Modelo'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum modelo de contrato cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">Crie um modelo para começar a gerar contratos</p>
            </CardContent>
          </Card>
        ) : (
          templates.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {t.titulo}
                </CardTitle>
                {t.descricao && (
                  <CardDescription>{t.descricao}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-3 font-mono">
                  {t.conteudo.substring(0, 200)}...
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(t)}>
                    <Edit className="w-4 h-4 mr-1" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
