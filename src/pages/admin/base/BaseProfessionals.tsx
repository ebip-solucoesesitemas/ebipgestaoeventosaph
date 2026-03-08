import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Users, ArrowLeft, Stethoscope, UserRound, Ambulance, Calendar } from 'lucide-react';

interface Base {
  id: string;
  nome: string;
  sigla: string;
}

interface ProfessionalSummary {
  id: string;
  nome: string;
  especialidade: string;
  cargo: string;
  event_count: number;
}

const especialidadeIcons: Record<string, typeof Stethoscope> = {
  'Médico': Stethoscope,
  'Enfermeiro': UserRound,
  'Técnico': UserRound,
  'Socorrista': Ambulance,
};

export default function BaseProfessionals() {
  const { baseId } = useParams<{ baseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [base, setBase] = useState<Base | null>(null);
  const [professionals, setProfessionals] = useState<ProfessionalSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!baseId) return;

    const fetchData = async () => {
      setIsLoading(true);

      // Fetch base info
      const { data: baseData } = await supabase
        .from('bases')
        .select('id, nome, sigla')
        .eq('id', baseId)
        .single();

      if (baseData) setBase(baseData);

      const profMap = new Map<string, ProfessionalSummary>();

      // 1. Fetch professionals linked to this base via base_id
      const { data: linkedProfiles } = await supabase
        .from('profiles')
        .select('id, nome, especialidade, cargo')
        .eq('base_id', baseId)
        .eq('hidden', false)
        .eq('is_account_only', false);

      if (linkedProfiles) {
        linkedProfiles.forEach((p: any) => {
          profMap.set(p.id, {
            id: p.id,
            nome: p.nome,
            especialidade: p.especialidade,
            cargo: p.cargo,
            event_count: 0,
          });
        });
      }

      // 2. Fetch events for this base
      const { data: baseEvents } = await supabase
        .from('events')
        .select('id')
        .eq('base_id', baseId);

      if (baseEvents && baseEvents.length > 0) {
        const eventIds = baseEvents.map(e => e.id);

        const { data: assignmentsData } = await supabase
          .from('event_assignments')
          .select('profile_id, profiles(id, nome, especialidade, cargo, hidden, is_account_only)')
          .in('event_id', eventIds);

        if (assignmentsData) {
          assignmentsData.forEach((a: any) => {
            if (!a.profiles) return;
            const p = a.profiles;
            // Skip hidden (super-admin) and access-only accounts
            if (p.hidden || p.is_account_only) return;
            if (profMap.has(p.id)) {
              profMap.get(p.id)!.event_count++;
            } else {
              profMap.set(p.id, {
                id: p.id,
                nome: p.nome,
                especialidade: p.especialidade,
                cargo: p.cargo,
                event_count: 1,
              });
            }
          });
        }
      }

      setProfessionals(
        Array.from(profMap.values()).sort((a, b) => b.event_count - a.event_count)
      );
      setIsLoading(false);
    };

    fetchData();
  }, [baseId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/professionals')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Profissionais — {base?.sigla} {base?.nome}
          </h1>
          <p className="text-muted-foreground">Profissionais vinculados ou que já atuaram nesta base</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {professionals.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum profissional atuou nesta base ainda</p>
            </CardContent>
          </Card>
        ) : (
          professionals.map((prof) => {
            const Icon = especialidadeIcons[prof.especialidade] || UserRound;
            return (
              <Card key={prof.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{prof.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">{prof.especialidade}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={prof.cargo === 'admin' ? 'default' : 'secondary'}>
                      {prof.cargo === 'admin' ? 'Administrador' : 'Equipe'}
                    </Badge>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {prof.event_count} evento{prof.event_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
