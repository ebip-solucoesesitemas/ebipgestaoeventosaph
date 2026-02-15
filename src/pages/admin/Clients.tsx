import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Building2, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { CepInput } from '@/components/CepInput';
import { GenerateContractDialog } from '@/components/GenerateContractDialog';
import { ClientContractsList } from '@/components/ClientContractsList';

interface Client {
  id: string;
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cep: string | null;
}

export default function Clients() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    documento: '',
    email: '',
    telefone: '',
    endereco: '',
    cep: '',
  });

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('nome');

    if (error) {
      toast({ title: 'Erro ao carregar clientes', variant: 'destructive' });
    } else {
      setClients(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      nome: formData.nome,
      documento: formData.documento || null,
      email: formData.email || null,
      telefone: formData.telefone || null,
      endereco: formData.endereco || null,
      cep: formData.cep || null,
    };

    if (editingClient) {
      const { error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', editingClient.id);

      if (error) {
        toast({ title: 'Erro ao atualizar cliente', variant: 'destructive' });
      } else {
        toast({ title: 'Cliente atualizado!' });
      }
    } else {
      const { error } = await supabase.from('clients').insert(payload);

      if (error) {
        toast({ title: 'Erro ao criar cliente', variant: 'destructive' });
      } else {
        toast({ title: 'Cliente criado!' });
      }
    }

    setIsDialogOpen(false);
    setEditingClient(null);
    setFormData({ nome: '', documento: '', email: '', telefone: '', endereco: '', cep: '' });
    fetchClients();
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      nome: client.nome,
      documento: client.documento || '',
      email: client.email || '',
      telefone: client.telefone || '',
      endereco: client.endereco || '',
      cep: client.cep || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este cliente?')) return;

    const { error } = await supabase.from('clients').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir cliente', variant: 'destructive' });
    } else {
      toast({ title: 'Cliente excluído!' });
      fetchClients();
    }
  };

  const [contractClient, setContractClient] = useState<Client | null>(null);
  const [contractsListClient, setContractsListClient] = useState<Client | null>(null);

  const handleAddressFound = (address: { endereco: string }) => {
    setFormData(prev => ({ ...prev, endereco: address.endereco }));
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
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Empresas e contratantes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="btn-touch gap-2"
              onClick={() => {
                setEditingClient(null);
                setFormData({ nome: '', documento: '', email: '', telefone: '', endereco: '', cep: '' });
              }}
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Novo Cliente</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome / Razão Social *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="documento">CNPJ / CPF</Label>
                <Input
                  id="documento"
                  value={formData.documento}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <CepInput
                  value={formData.cep}
                  onChange={(cep) => setFormData({ ...formData, cep })}
                  onAddressFound={handleAddressFound}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full btn-touch">
                {editingClient ? 'Salvar Alterações' : 'Criar Cliente'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clients.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum cliente cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  {client.nome}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {client.documento && (
                  <p className="text-sm text-muted-foreground">{client.documento}</p>
                )}
                {client.email && (
                  <p className="text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {client.email}
                  </p>
                )}
                {client.telefone && (
                  <p className="text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {client.telefone}
                  </p>
                )}
                {client.endereco && (
                  <p className="text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {client.endereco}
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setContractClient(client)}
                    title="Gerar Contrato"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Novo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setContractsListClient(client)}
                    title="Ver Contratos"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Contratos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(client)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(client.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {contractClient && (
        <GenerateContractDialog
          client={contractClient}
          open={!!contractClient}
          onOpenChange={(open) => { if (!open) setContractClient(null); }}
          onContractSaved={() => {
            if (contractsListClient?.id === contractClient.id) {
              setContractsListClient({ ...contractClient });
            }
          }}
        />
      )}
      {contractsListClient && (
        <ClientContractsList
          clientId={contractsListClient.id}
          clientName={contractsListClient.nome}
          open={!!contractsListClient}
          onOpenChange={(open) => { if (!open) setContractsListClient(null); }}
        />
      )}
    </div>
  );
}