import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Early-stage forecast — AdSignal Pro',
  description:
    'Forecast how a young Meta campaign will land: learning-phase gate, full-budget projection, funnel leak check and break-even math. A planning model, not a Meta prediction.',
};

export default function ForecastLayout({ children }: { children: ReactNode }) {
  return children;
}
