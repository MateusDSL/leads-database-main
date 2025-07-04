"use client";

import React from "react";
import { HeroUIProvider } from "@heroui/react";

export function Providers({ children }: { children: React.ReactNode }) {
  // O HeroUIProvider envolve toda a sua aplicação.
  return (
    <HeroUIProvider>
      {children}
    </HeroUIProvider>
  );
}