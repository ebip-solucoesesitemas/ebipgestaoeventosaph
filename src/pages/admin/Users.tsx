import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Shield, Users as UsersIcon, Edit } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type EspecialidadeTipo = Database["public"]["Enums"]["especialidade_tipo"];
type CargoTipo = Database["public"]["Enums"]["cargo_tipo"];

interface UserProfile {
  id: string;
  nome: string;
  especialidade: EspecialidadeTipo;
  registro_profissional: string;
  cargo: CargoTipo;
  user_id: string | null;
  base_id: string | null;
  is_account_only: boolean;
  bases: { sigla: string; nome: string } | null;
}

const especialidades: EspecialidadeTipo[] = [
  "Médico",
  "Enfermeiro",
  "Técnico",
  "Socorrista",
  "Gestor",
  "Administrador",
  "VTR" as EspecialidadeTipo,
];

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    password: "",
    cargo: "equipe" as CargoTipo,
    especialidade: "Socorrista" as EspecialidadeTipo,
    registro_profissional: "",
    base_id: "",
    telefone: "",
    is_account_only: false,
  });

  const resetForm = () => {
    setForm({
      nome: "",
      email: "",
      password: "",
      cargo: "equipe",
      especialidade: "Socorrista",
      registro_profissional: "",
      base_id: "",
      telefone: "",
      is_account_only: false,
    });
    setEditingUser(null);
  };

  const openEditDialog = (user: UserProfile) => {
    setEditingUser(user);
    setForm({
      nome: user.nome,
      email: "",
      password: "",
      cargo: user.cargo,
      especialidade: user.especialidade,
      registro_profissional: user.registro_profissional,
      base_id: user.base_id || "",
      telefone: (user as any).telefone || "",
      is_account_only: user.is_account_only || false,
    });
    setOpen(true);
  };

  const { data: bases = [] } = useQuery({
    queryKey: ["bases-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bases").select("id, sigla, nome").order("sigla");
      if (error) throw error;
      return data;
    },
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, bases(sigla, nome)")
        .not("user_id", "is", null)
        .eq("hidden", false)
        .order("nome");
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const res = await supabase.functions.invoke("create-user", {
        body: {
          email: form.email.trim(),
          password: form.password,
          profileData: {
            nome: form.nome.trim(),
            especialidade: form.especialidade,
            registro_profissional: form.registro_profissional.trim(),
            cargo: form.cargo,
            telefone: form.telefone.trim() || null,
            is_account_only: form.is_account_only,
            ...(form.base_id ? { base_id: form.base_id } : {}),
          },
        },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      toast({ title: "Usuário criado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar usuário", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingUser) throw new Error("Nenhum usuário selecionado");

      const payload: Record<string, unknown> = {
        nome: form.nome.trim(),
        especialidade: form.especialidade,
        registro_profissional: form.registro_profissional.trim(),
        cargo: form.cargo,
        base_id: form.base_id || null,
        telefone: form.telefone.trim() || null,
        is_account_only: form.is_account_only,
      };

      const { error } = await supabase.from("profiles").update(payload).eq("id", editingUser.id);

      if (error) throw new Error(error.message);

      // Update role if cargo changed
      if (editingUser.cargo !== form.cargo && editingUser.user_id) {
        await (supabase.rpc as any)("toggle_user_role", { p_profile_id: editingUser.id });
      }
    },
    onSuccess: () => {
      toast({ title: "Usuário atualizado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const res = await supabase.functions.invoke("delete-user", {
        body: { profileId },
      });

      if (res.error) throw new Error(res.error.message);
      const resData = res.data;
      if (resData?.error) throw new Error(resData.error);
      return resData;
    },
    onMutate: async (profileId: string) => {
      await queryClient.cancelQueries({ queryKey: ["admin-users"] });
      const previous = queryClient.getQueryData<UserProfile[]>(["admin-users"]);
      queryClient.setQueryData<UserProfile[]>(["admin-users"], (old) =>
        old ? old.filter((u) => u.id !== profileId) : []
      );
      return { previous };
    },
    onSuccess: () => {
      toast({ title: "Usuário excluído" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteId(null);
    },
    onError: (err: Error, _profileId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["admin-users"], context.previous);
      }
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
      setDeleteId(null);
    },
  });

  const isFormValid = editingUser
    ? form.nome.trim()
    : form.nome.trim() && form.email.trim() && form.password.length >= 6;

  const handleSubmit = () => {
    if (editingUser) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon className="h-6 w-6" /> Usuários
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie contas com acesso ao sistema</p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar Usuário" : "Cadastrar Usuário"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Nome completo *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  maxLength={100}
                />
              </div>
              {!editingUser && (
                <>
                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Senha * (mín. 6 caracteres)</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      maxLength={72}
                    />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Cargo *</Label>
                  <Select value={form.cargo} onValueChange={(v: CargoTipo) => setForm((f) => ({ ...f, cargo: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipe">Equipe</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value={"admin_bnu" as CargoTipo}>Admin BNU</SelectItem>
                      <SelectItem value={"admin_fln" as CargoTipo}>Admin FLN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Especialidade *</Label>
                  <Select
                    value={form.especialidade}
                    onValueChange={(v: EspecialidadeTipo) => setForm((f) => ({ ...f, especialidade: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {especialidades.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  maxLength={20}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Registro Profissional</Label>
                  <Input
                    value={form.registro_profissional}
                    onChange={(e) => setForm((f) => ({ ...f, registro_profissional: e.target.value }))}
                    maxLength={50}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Base</Label>
                  <Select value={form.base_id} onValueChange={(v) => setForm((f) => ({ ...f, base_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bases.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.sigla} - {b.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2 py-2">
                <Checkbox
                  id="is_account_only"
                  checked={form.is_account_only}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, is_account_only: !!checked }))}
                />
                <Label htmlFor="is_account_only" className="text-sm cursor-pointer">
                  Conta apenas para acesso (não contabilizar em relatórios financeiros)
                </Label>
              </div>
              <Button className="w-full" disabled={!isFormValid || isPending} onClick={handleSubmit}>
                {isPending ? "Processando..." : editingUser ? "Salvar Alterações" : "Cadastrar"}
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
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.nome}
                    {u.is_account_only && (
                      <Badge variant="outline" className="ml-2 text-xs">Acesso</Badge>
                    )}
                  </TableCell>
                  <TableCell>{u.bases?.sigla || "—"}</TableCell>
                  <TableCell>{u.especialidade}</TableCell>
                  <TableCell>{u.registro_profissional || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.cargo === "admin" ? "default" : u.cargo === "gestor" ? "outline" : "secondary"} className="gap-1">
                      {u.cargo === "admin" && <Shield className="h-3 w-3" />}
                      {u.cargo === "admin" ? "Admin" : u.cargo === "gestor" ? "Gestor" : "Equipe"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(u)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(u.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a conta de acesso e o perfil do usuário. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
