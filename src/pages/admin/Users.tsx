import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Shield, Users as UsersIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type EspecialidadeTipo = Database['public']['Enums']['especialidade_tipo'];
type CargoTipo = Database['public']['Enums']['cargo_tipo'];

interface UserProfile {
  id: string;
  nome: string;
  especialidade: EspecialidadeTipo;
  registro_profissional: string;
  cargo: CargoTipo;
  user_id: string | null;
  base_id: string | null;
  bases: { sigla: string; nome: string } | null;
}

const especialidades: EspecialidadeTipo[] = ['Médico', 'Enfermeiro', 'Técnico', 'Socorrista'];

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    password: '',
    cargo: 'equipe' as CargoTipo,
    especialidade: 'Socorrista' as EspecialidadeTipo,
    registro_profissional: '',
    base_id: '',
  });

  const { data: bases = [] } = useQuery({
    queryKey: ['bases-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bases').select('id, sigla, nome').order('sigla');
      if (error) throw error;
      return data;
    },
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, bases(sigla, nome)')
        .not('user_id', 'is', null)
        .order('nome');
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const res = await supabase.functions.invoke('create-user', {
        body: {
          email: form.email.trim(),
          password: form.password,
          profileData: {
            nome: form.nome.trim(),
            especialidade: form.especialidade,
            registro_profissional: form.registro_profissional.trim(),
            cargo: form.cargo,
            ...(form.base_id ? { base_id: form.base_id } : {}),
          },
        },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      toast({ title: 'Usuário criado com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setOpen(false);
      setForm({ nome: '', email: '', password: '', cargo: 'equipe', especialidade: 'Socorrista', registro_profissional: '', base_id: '' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao criar usuário', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const profile = users.find(u => u.id === profileId);
      if (!profile?.user_id) throw new Error('Usuário sem conta de acesso');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const res = await supabase.functions.invoke('delete-user', {
        body: { userId: profile.user_id },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      toast({ title: 'Usuário excluído' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
      setDeleteId(null);
    },
  });

  const isFormValid = form.nome.trim() && form.email.trim() && form.password.length >= 6 && form.registro_profissional.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon className="h-6 w-6" /> Usuários
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie contas com acesso ao sistema</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Nome completo *</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} maxLength={255} />
              </div>
              <div className="space-y-1.5">
                <Label>Senha * (mín. 6 caracteres)</Label>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} maxLength={72} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Cargo *</Label>
                  <Select value={form.cargo} onValueChange={(v: CargoTipo) => setForm(f => ({ ...f, cargo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipe">Equipe</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Especialidade *</Label>
                  <Select value={form.especialidade} onValueChange={(v: EspecialidadeTipo) => setForm(f => ({ ...f, especialidade: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {especialidades.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Registro Profissional *</Label>
                  <Input value={form.registro_profissional} onChange={e => setForm(f => ({ ...f, registro_profissional: e.target.value }))} maxLength={50} />
                </div>
                <div className="space-y-1.5">
                  <Label>Base</Label>
                  <Select value={form.base_id} onValueChange={(v) => setForm(f => ({ ...f, base_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {bases.map(b => <SelectItem key={b.id} value={b.id}>{b.sigla} - {b.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full" disabled={!isFormValid || createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? 'Criando...' : 'Cadastrar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground">Nenhum usuário cadastrado.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell>{u.bases?.sigla || '—'}</TableCell>
                  <TableCell>{u.especialidade}</TableCell>
                  <TableCell>{u.registro_profissional}</TableCell>
                  <TableCell>
                    <Badge variant={u.cargo === 'admin' ? 'default' : 'secondary'} className="gap-1">
                      {u.cargo === 'admin' && <Shield className="h-3 w-3" />}
                      {u.cargo === 'admin' ? 'Admin' : 'Equipe'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(u.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a conta de acesso e o perfil do usuário. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
