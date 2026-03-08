import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, DollarSign, Users } from 'lucide-react';

interface Profile {
  id: string;
  nome: string;
  especialidade: string;
}

interface Rate {
  id?: string;
  profile_id: string;
  valor_hora: number;
  valor_evento: number;
}

export default function ProfessionalRates() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rates, setRates] = useState<Record<string, Rate>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    const [profilesRes, ratesRes] = await Promise.all([
      supabase.from('profiles').select('id, nome, especialidade').eq('hidden', false).eq('is_account_only', false).order('nome'),
      supabase.from('professional_rates').select('*'),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data);
    
    const ratesMap: Record<string, Rate> = {};
    ratesRes.data?.forEach((r) => {
      ratesMap[r.profile_id] = r;
    });
    setRates(ratesMap);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateRate = (profileId: string, field: 'valor_hora' | 'valor_evento', value: string) => {
    setRates((prev) => ({
      ...prev,
      [profileId]: {
        ...prev[profileId],
        profile_id: profileId,
        [field]: parseFloat(value) || 0,
      },
    }));
  };

  const saveRate = async (profileId: string) => {
    setSaving(profileId);
    const rate = rates[profileId];

    if (!rate) {
      setSaving(null);
      return;
    }

    const payload = {
      profile_id: profileId,
      valor_hora: rate.valor_hora || 0,
      valor_evento: rate.valor_evento || 0,
    };

    const { error } = rate.id
      ? await supabase.from('professional_rates').update(payload).eq('id', rate.id)
      : await supabase.from('professional_rates').insert(payload);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Valor salvo!' });
      fetchData();
    }
    setSaving(null);
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Valores por Profissional</h1>
        <p className="text-muted-foreground">Configure os valores de pagamento para cada profissional</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profiles.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum profissional cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          profiles.map((profile) => {
            const rate = rates[profile.id] || { valor_hora: 0, valor_evento: 0 };
            return (
              <Card key={profile.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{profile.nome}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {profile.especialidade}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Valor por Hora (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={rate.valor_hora || ''}
                      onChange={(e) => updateRate(profile.id, 'valor_hora', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Valor por Evento (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={rate.valor_evento || ''}
                      onChange={(e) => updateRate(profile.id, 'valor_evento', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => saveRate(profile.id)}
                    disabled={saving === profile.id}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving === profile.id ? 'Salvando...' : 'Salvar'}
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
