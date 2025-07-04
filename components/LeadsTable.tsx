"use client"

import React from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { GoogleIcon } from '@/components/ui/icons';
import { type Lead, type QualificationStatus, type SortConfig } from "@/app/page";

interface LeadsTableProps {
  loading: boolean;
  leads: Lead[];
  selectedRows: number[];
  onRowSelect: (leadIds: number[]) => void;
  onQualificationChange: (leadId: number, newQualification: QualificationStatus) => void;
  onLeadClick: (lead: Lead) => void;
  sortConfig: SortConfig;
  onSort: (column: keyof Lead) => void;
}

const qualificationVariantMap: Record<QualificationStatus, React.ComponentProps<typeof Badge>['variant']> = {
  'Quente': 'destructive',
  'Morno': 'default',
  'Frio': 'secondary',
  'Novo': 'outline',
  'Venda': 'default',
};

const SortableHeader = ({
  column,
  label,
  sortConfig,
  onSort,
}: {
  column: keyof Lead;
  label: string;
  sortConfig: SortConfig;
  onSort: (column: keyof Lead) => void;
}) => {
  const isCurrentColumn = sortConfig.column === column;
  const direction = isCurrentColumn ? sortConfig.direction : undefined;

  return (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-2">
        {label}
        {isCurrentColumn && direction === "asc" && <ArrowUp className="h-4 w-4" />}
        {isCurrentColumn && direction === "desc" && <ArrowDown className="h-4 w-4" />}
      </div>
    </TableHead>
  );
};

export function LeadsTable({
  loading,
  leads,
  selectedRows,
  onRowSelect,
  onLeadClick,
  sortConfig,
  onSort,
}: LeadsTableProps) {
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    onRowSelect(checked ? leads.map((lead) => lead.id) : [])
  }

  const isAllSelected = selectedRows.length > 0 && selectedRows.length === leads.length;
  const isSomeSelected = selectedRows.length > 0 && selectedRows.length < leads.length;

  const renderOrigin = (origin: string | undefined) => {
    const isGoogle = origin?.toLowerCase() === 'google' || origin?.toLowerCase() === 'go-ads';
    if (isGoogle) {
      return (
        <div className="flex items-center gap-2">
          <GoogleIcon className="h-4 w-4" />
          <span>Google</span>
        </div>
      );
    }
    return <span>{origin ?? 'N/A'}</span>;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead style={{ width: '50px' }}>
                  <Checkbox
                    checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <SortableHeader column="created_at" label="Data" sortConfig={sortConfig} onSort={onSort} />
                <SortableHeader column="name" label="Nome" sortConfig={sortConfig} onSort={onSort} />
                <SortableHeader column="phone" label="Telefone" sortConfig={sortConfig} onSort={onSort} />
                <SortableHeader column="origem" label="Origem" sortConfig={sortConfig} onSort={onSort} />
                <SortableHeader column="qualification_status" label="Qualificação" sortConfig={sortConfig} onSort={onSort} />
                <SortableHeader column="comment" label="Comentário" sortConfig={sortConfig} onSort={onSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : leads.length > 0 ? (
                leads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    data-state={selectedRows.includes(lead.id) ? "selected" : "unselected"}
                    onClick={() => onLeadClick(lead)}
                    className="cursor-pointer"
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedRows.includes(lead.id)}
                        onCheckedChange={(checked) => {
                          const newSelectedRows = checked
                            ? [...selectedRows, lead.id]
                            : selectedRows.filter((id) => id !== lead.id);
                          onRowSelect(newSelectedRows);
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(lead.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarFallback>{lead.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {lead.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.phone ?? 'N/A'}</TableCell>
                    <TableCell>{renderOrigin(lead.origem)}</TableCell>
                    <TableCell>
                      <Badge variant={qualificationVariantMap[lead.qualification_status ?? 'Novo'] || 'outline'}>
                        {lead.qualification_status ?? 'Novo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {lead.comment || "-"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Nenhum lead encontrado com os filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}