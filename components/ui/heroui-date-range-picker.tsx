"use client";

import React from "react";
import { RangeCalendar } from "@heroui/react";
import { today, getLocalTimeZone, parseDate } from "@internationalized/date";
import type { DateValue } from "@react-types/datepicker";

// Definindo o tipo para o intervalo de datas que o calendário do HeroUI utiliza
interface DateRange {
  start: DateValue;
  end: DateValue;
}

// Adiciona as props para controle externo do valor e callback de mudança
type HeroUIRangeCalendarProps = {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
};

export default function HeroUIRangeCalendar({ value, onChange }: HeroUIRangeCalendarProps) {
  // 1. Define o valor máximo de data como a data atual na timezone local.
  const maxDate = today(getLocalTimeZone());

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">Selecione o Período</h3>
      <RangeCalendar
        aria-label="Seletor de Período de Datas"
        
        // 3. Define o valor máximo para seleção
        maxValue={maxDate}
        
        // 4. Usa o valor controlado e callback do pai
        value={value}
        onChange={onChange}
      />
      
      {/* Opcional: Exibe as datas selecionadas */}
      {value && (
        <div className="mt-4 text-center text-sm">
          <p>
            <b>Início:</b> {value.start.toString()}
          </p>
          <p>
            <b>Fim:</b> {value.end.toString()}
          </p>
        </div>
      )}
    </div>
  );
}