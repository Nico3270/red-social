"use client";

import { AnalyticsBootstrap } from "@/analytics/AnalyticsBootstrap";
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';


interface Props {
  children: React.ReactNode;
}

export const Provider = ({ children }: Props) => {
  // Usar useState para que el cliente no se recree en cada render
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <AnalyticsBootstrap />
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
};