import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Send, MessageSquare, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Ticket {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  bug: "Bug",
  feature_request: "Solicitação",
  question: "Dúvida",
  other: "Outro",
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Baixa", className: "bg-muted text-muted-foreground" },
  medium: { label: "Média", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  high: { label: "Alta", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  critical: { label: "Crítica", className: "bg-destructive text-destructive-foreground" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Aberto", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  in_progress: { label: "Em Andamento", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  resolved: { label: "Resolvido", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  closed: { label: "Fechado", className: "bg-muted text-muted-foreground" },
};

export default function SupportTickets() {
  const { user, profile, isSuperAdmin } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("bug");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Detail dialog
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTickets = useCallback(async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar chamados");
    } else {
      const ticketData = (data as unknown as Ticket[]) || [];
      setTickets(ticketData);
      // Load creator names
      const creatorIds = [...new Set(ticketData.map(t => t.created_by))];
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nome")
          .in("user_id", creatorIds);
        if (profiles) {
          const map: Record<string, string> = {};
          profiles.forEach((p: any) => { map[p.user_id] = p.nome; });
          setProfileNames(prev => ({ ...prev, ...map }));
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadMessages = useCallback(async (ticketId: string) => {
    const { data, error } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (!error && data) {
      setMessages(data as unknown as TicketMessage[]);
      // Load profile names for message authors
      const userIds = [...new Set(data.map((m: any) => m.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nome")
          .in("user_id", userIds);
        if (profiles) {
          const map: Record<string, string> = {};
          profiles.forEach((p: any) => { map[p.user_id] = p.nome; });
          setProfileNames(prev => ({ ...prev, ...map }));
        }
      }
    }
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!selectedTicket) return;
    const channel = supabase
      .channel(`ticket-messages-${selectedTicket.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "ticket_messages",
        filter: `ticket_id=eq.${selectedTicket.id}`,
      }, () => {
        loadMessages(selectedTicket.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket, loadMessages]);

  // Polling fallback every 5s when detail dialog is open
  useEffect(() => {
    if (!selectedTicket) return;
    const interval = setInterval(() => {
      loadMessages(selectedTicket.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedTicket, loadMessages]);

  const handleCreate = async () => {
    if (!user || !newTitle.trim() || !newDescription.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("support_tickets").insert({
      title: newTitle.trim(),
      description: newDescription.trim(),
      category: newCategory,
      created_by: user.id,
    } as any);
    if (error) {
      toast.error("Erro ao criar chamado");
    } else {
      toast.success("Chamado criado com sucesso");
      setCreateOpen(false);
      setNewTitle("");
      setNewCategory("bug");
      setNewDescription("");
      loadTickets();
    }
    setCreating(false);
  };

  const handleSendMessage = async () => {
    if (!user || !selectedTicket || !newMessage.trim()) return;
    setSending(true);
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: selectedTicket.id,
      user_id: user.id,
      message: newMessage.trim(),
    } as any);
    if (error) {
      toast.error("Erro ao enviar mensagem");
    } else {
      setNewMessage("");
      await loadMessages(selectedTicket.id);
    }
    setSending(false);
  };

  const handleUpdateTicket = async (field: string, value: string) => {
    if (!selectedTicket) return;
    const updateData: any = { [field]: value };
    if (field === "status" && value === "resolved") {
      updateData.resolved_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from("support_tickets")
      .update(updateData)
      .eq("id", selectedTicket.id);
    if (error) {
      toast.error("Erro ao atualizar chamado");
    } else {
      toast.success("Chamado atualizado");
      setSelectedTicket({ ...selectedTicket, ...updateData });
      loadTickets();
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedTicket || !user) return;
    const { error } = await supabase
      .from("support_tickets")
      .update({ assigned_to: user.id, status: "in_progress" } as any)
      .eq("id", selectedTicket.id);
    if (error) {
      toast.error("Erro ao atribuir chamado");
    } else {
      toast.success("Chamado atribuído a você");
      setSelectedTicket({ ...selectedTicket, assigned_to: user.id, status: "in_progress" });
      loadTickets();
    }
  };

  const openDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setMessages([]);
    loadMessages(ticket.id);
  };

  const filteredTickets = tickets.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chamados</h1>
          <p className="text-sm text-muted-foreground">Sistema de suporte e solicitações</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Chamado
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="open">Aberto</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="resolved">Resolvido</SelectItem>
            <SelectItem value="closed">Fechado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="feature_request">Solicitação</SelectItem>
            <SelectItem value="question">Dúvida</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Nº</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                   <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum chamado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map(ticket => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetail(ticket)}
                  >
                    <TableCell className="font-mono text-sm">#{ticket.ticket_number}</TableCell>
                    <TableCell className="font-medium">{ticket.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{categoryLabels[ticket.category] || ticket.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityConfig[ticket.priority]?.className}>
                        {priorityConfig[ticket.priority]?.label || ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[ticket.status]?.className}>
                        {statusConfig[ticket.status]?.label || ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Chamado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Título</label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Descreva brevemente o problema"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Categoria</label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feature_request">Solicitação de Funcionalidade</SelectItem>
                  <SelectItem value="question">Dúvida</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Descrição</label>
              <Textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Descreva em detalhes..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !newTitle.trim() || !newDescription.trim()}>
              {creating ? "Criando..." : "Criar Chamado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={open => { if (!open) setSelectedTicket(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground">#{selectedTicket.ticket_number}</span>
                  {selectedTicket.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
                {/* Ticket Info */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{selectedTicket.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{categoryLabels[selectedTicket.category]}</Badge>
                    <Badge className={priorityConfig[selectedTicket.priority]?.className}>
                      {priorityConfig[selectedTicket.priority]?.label}
                    </Badge>
                    <Badge className={statusConfig[selectedTicket.status]?.className}>
                      {statusConfig[selectedTicket.status]?.label}
                    </Badge>
                  </div>
                </div>

                {/* Super Admin Controls */}
                {isSuperAdmin && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Status</label>
                        <Select value={selectedTicket.status} onValueChange={v => handleUpdateTicket("status", v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Aberto</SelectItem>
                            <SelectItem value="in_progress">Em Andamento</SelectItem>
                            <SelectItem value="resolved">Resolvido</SelectItem>
                            <SelectItem value="closed">Fechado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
                        <Select value={selectedTicket.priority} onValueChange={v => handleUpdateTicket("priority", v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="critical">Crítica</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {!selectedTicket.assigned_to && (
                      <Button variant="outline" size="sm" onClick={handleAssignToMe}>
                        <User className="h-3 w-3 mr-1" /> Atribuir a mim
                      </Button>
                    )}
                  </>
                )}

                <Separator />

                {/* Messages */}
                <div className="min-h-0">
                  <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" /> Mensagens
                  </h4>
                  <ScrollArea className="h-[250px] border rounded-md p-3">
                    {messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem ainda</p>
                    ) : (
                      <div className="space-y-3">
                        {messages.map(msg => (
                          <div
                            key={msg.id}
                            className={`rounded-lg p-3 text-sm ${
                              msg.user_id === user?.id
                                ? "bg-primary/10 ml-8"
                                : "bg-muted mr-8"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-xs text-foreground">
                                {profileNames[msg.user_id] || "Usuário"}
                              </span>
                              <div className="flex items-center gap-1">
                                {msg.is_internal && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">Interno</Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                            </div>
                            <p className="text-foreground whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Send Message */}
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Escreva uma mensagem..."
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  />
                  <Button size="icon" onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
