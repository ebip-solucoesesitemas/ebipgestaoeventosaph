import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CepInputProps {
  value: string;
  onChange: (cep: string) => void;
  onAddressFound: (address: {
    logradouro: string;
    bairro: string;
    cidade: string;
    uf: string;
    endereco: string;
  }) => void;
}

export function CepInput({ value, onChange, onAddressFound }: CepInputProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const formatCep = (cep: string) => {
    const numbers = cep.replace(/\D/g, '').slice(0, 8);
    if (numbers.length > 5) {
      return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
    }
    return numbers;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatCep(e.target.value));
  };

  const searchCep = async () => {
    const cleanCep = value.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      toast({ title: 'CEP inválido', description: 'Digite um CEP com 8 dígitos', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({ title: 'CEP não encontrado', variant: 'destructive' });
        return;
      }

      const endereco = [data.logradouro, data.bairro, `${data.localidade} - ${data.uf}`]
        .filter(Boolean)
        .join(', ');

      onAddressFound({
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || '',
        endereco,
      });

      toast({ title: 'Endereço encontrado!' });
    } catch {
      toast({ title: 'Erro ao buscar CEP', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={handleChange}
        placeholder="00000-000"
        maxLength={9}
        className="flex-1"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={searchCep}
        disabled={isLoading || value.replace(/\D/g, '').length !== 8}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
      </Button>
    </div>
  );
}
