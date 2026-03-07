import type { CryptoData } from '../types/crypto';
import { CryptoCard } from './CryptoCard';

interface CryptoSectionProps {
  title: string;
  description: string;
  cryptos: CryptoData[];
  icon: 'major' | 'emerging' | 'growing';
}

export const CryptoSection = ({ title, description, cryptos }: CryptoSectionProps) => {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-base font-medium text-white">{title}</h2>
        <span className="text-okx-text-muted text-sm">{description}</span>
      </div>

      <div className="h-px bg-okx-border mb-3" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {cryptos.map((crypto) => (
          <CryptoCard key={crypto.id} crypto={crypto} />
        ))}
      </div>
    </section>
  );
};
