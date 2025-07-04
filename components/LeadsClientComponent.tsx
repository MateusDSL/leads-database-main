// components/LeadsClientComponent.tsx

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { addDays, startOfDay, endOfDay, startOfMonth, endOfYear, differenceInDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { StyledCard } from "@/components/ui/styled-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from '@/components/AppSidebar';
import { Building2, Home, Settings, Target, Mail, Phone, BarChart3, FileText, Users, User } from "lucide-react";
import { LeadDetailSheet } from '@/components/LeadDetailSheet';
import { LeadsTable } from '@/components/LeadsTable';
import { StatsCards } from '@/components/StatsCards';
import { FilterBar } from "@/components/FilterBar";
import { NewLeadForm } from './NewLeadForm';
import { supabase } from "../supabaseClient";
import { Lead, QualificationStatus } from "@/app/page";
import { LeadsBySourcePieChart } from './LeadsBySourcePieChart';
import { LeadsByDayChart } from './LeadsByDayChart';
import { format } from 'date-fns';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
// Define SortConfig locally since it's not exported from LeadsTable
type SortConfig = {
  column: keyof Lead;
  direction: "asc" | "desc";
};

const navigationData = {
    // Grupo Principal de Navegação
    navMain: [
      { 
        title: "Navegação", 
        items: [ 
          { title: "Painel Principal", url: "#", icon: Home, isActive: true }, 
          { title: "Todos os Leads", url: "#", icon: Users } 
        ] 
      },
      // Grupo para Análises e Relatórios
      { 
        title: "Análise", 
        items: [ 
          { title: "Relatórios", url: "#", icon: BarChart3 },
          { title: "Origem dos Leads", url: "#", icon: Target }
        ] 
      },
      // Grupo para Configurações Gerais
      { 
        title: "Ajustes", 
        items: [ 
          { title: "Minha Conta", url: "#", icon: User },
          { title: "Configurações", url: "#", icon: Settings } 
        ] 
      },
    ],
};

interface LeadsClientComponentProps {
  initialLeads: Lead[];
  serverError?: string;
}

export default function LeadsClientComponent({ initialLeads, serverError }: LeadsClientComponentProps) {
    const [allLeads, setAllLeads] = useState<Lead[]>(initialLeads);
    const [error, setError] = useState<string | null>(serverError || null);
    
    // O useEffect que atualizamos abaixo garante que o estado local
    // seja atualizado com os dados iniciais do servidor.
    useEffect(() => {
        setAllLeads(initialLeads);
    }, [initialLeads]);
    
    // --- INÍCIO DO NOVO CÓDIGO PARA REALTIME ---
    useEffect(() => {
        // 1. Cria um canal de comunicação único para a tabela 'leads'.
        const channel = supabase.channel('leads-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'leads' },
                (payload) => {
                    console.log('Alteração recebida!', payload);

                    // 2. Trata cada tipo de evento (INSERT, UPDATE, DELETE)
                    if (payload.eventType === 'INSERT') {
                        const newLead = payload.new as Lead;
                        setAllLeads(currentLeads => [newLead, ...currentLeads]);
                    } 
                    else if (payload.eventType === 'UPDATE') {
                        const updatedLead = payload.new as Lead;
                        setAllLeads(currentLeads => 
                            currentLeads.map(lead => 
                                lead.id === updatedLead.id ? updatedLead : lead
                            )
                        );
                    }
                    else if (payload.eventType === 'DELETE') {
                        const deletedLeadId = (payload.old as Lead).id;
                        setAllLeads(currentLeads => 
                            currentLeads.filter(lead => lead.id !== deletedLeadId)
                        );
                    }
                }
            )
            .subscribe();

        // 3. Função de limpeza: É MUITO IMPORTANTE remover a inscrição 
        //    quando o componente for "desmontado" para evitar vazamentos de memória.
        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]); // Dependência do cliente supabase para garantir que ele esteja disponível.
    // --- FIM DO NOVO CÓDIGO PARA REALTIME ---

    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("todos");
    const [sourceFilter, setSourceFilter] = useState("todos");
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfDay(new Date()), });
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
    const [newBulkStatus, setNewBulkStatus] = useState<QualificationStatus | null>(null);

    // 1. Estado para controlar a ordenação
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        column: "created_at",
        direction: "desc",
    });

    const getStandardizedOrigin = (source?: string, utm_source?: string): string => {
        if (utm_source === 'go-ads' || source === 'google-ads') return 'Google';
        if (utm_source === 'meta-ads') return 'Meta';
        if (source === 'linkedin') return 'LinkedIn';
        if (source === 'website') return 'Website';
        if (source === 'indicacao') return 'Indicação';
        if (source === 'email') return 'Email Marketing';
        if (!source && !utm_source) return 'Não Rastreada';
        return 'Outros';
    };

    const leadsWithOrigin = useMemo(() => allLeads.map(lead => ({ ...lead, origin: getStandardizedOrigin((lead as any).source, (lead as any).utm_source) })), [allLeads]);

    const filteredLeadsForCards = useMemo(() => leadsWithOrigin.filter((lead) => {
        const matchesStatus = statusFilter === "todos" || lead.qualification_status === statusFilter;
        const matchesSource = sourceFilter === "todos" || lead.origem === sourceFilter;
        let matchesDate = true;
        if (dateRange?.from) {
            // Agora usamos new Date() diretamente, que interpreta a string UTC corretamente.
            const leadDate = lead.created_at ? new Date(lead.created_at) : null;

            const fromDate = startOfDay(dateRange.from);
            const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
            matchesDate = leadDate ? leadDate >= fromDate && leadDate <= toDate : false;
        }
        // A lógica de busca por termo foi movida para o filtro da tabela para não afetar os cards
        return matchesStatus && matchesSource && matchesDate;
    }), [leadsWithOrigin, statusFilter, sourceFilter, dateRange]);

    const filteredLeadsForTable = useMemo(() => filteredLeadsForCards.filter((lead) => {
        const searchLower = searchTerm.toLowerCase();
        return (lead.name?.toLowerCase() || '').includes(searchLower);
    }), [filteredLeadsForCards, searchTerm]);

    // 2. Função para lidar com a mudança de ordenação
    const handleSort = (column: keyof Lead) => {
        setSortConfig((currentSortConfig) => {
            if (currentSortConfig.column === column) {
                return {
                    ...currentSortConfig,
                    direction: currentSortConfig.direction === "asc" ? "desc" : "asc",
                };
            }
            return { column, direction: "asc" };
        });
    };

    // 3. Ordenação dos leads filtrados para a tabela
    const sortedLeadsForTable = useMemo(() => {
        const leads = [...filteredLeadsForTable];
        leads.sort((a, b) => {
            const col = sortConfig.column;
            let aValue = (a as any)[col];
            let bValue = (b as any)[col];
            // Para datas, converte para timestamp
            if (col === "created_at") {
                aValue = aValue ? new Date(aValue).getTime() : 0;
                bValue = bValue ? new Date(bValue).getTime() : 0;
            }
            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
            if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
        return leads;
    }, [filteredLeadsForTable, sortConfig]);

    // Leads por dia para gráfico
    const leadsByDayData = useMemo(() => {
        const leadsCountByDay: { [key: string]: number } = {};

        filteredLeadsForCards.forEach(lead => {
            // Usamos new Date() e formatamos para a data local do navegador
            if(lead.created_at) {
                const day = format(new Date(lead.created_at), 'yyyy-MM-dd');
                if (!leadsCountByDay[day]) {
                    leadsCountByDay[day] = 0;
                }
                leadsCountByDay[day]++;
            }
        });

        // Converte o objeto em um array e ordena por data
        return Object.entries(leadsCountByDay)
            .map(([date, count]) => ({ date, leads: count }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    }, [filteredLeadsForCards]);

    const {
      totalLeads, deltaLeads,
      hotLeads, deltaHot,
      coldLeads, deltaCold,
      warmLeads, deltaWarm,
      sales, deltaSales
    } = useMemo(() => {
        const getDelta = (current: number, prev: number) => { if (prev === 0) return current > 0 ? "100.0" : "0.0"; const delta = (((current - prev) / prev) * 100); return delta.toFixed(1); }
        const getPreviousPeriodRange = (): DateRange | undefined => { if (!dateRange || !dateRange.from) return undefined; const from = dateRange.from; const to = dateRange.to ?? from; const diff = differenceInDays(to, from); const prevTo = addDays(from, -1); const prevFrom = addDays(prevTo, -diff); return { from: startOfDay(prevFrom), to: endOfDay(prevTo) }; }
        
        const currentLeads = filteredLeadsForCards;
        
        const prevDateRange = getPreviousPeriodRange();
        const prevLeads = prevDateRange ? allLeads.filter(lead => { const matchesStatus = statusFilter === "todos" || lead.qualification_status === statusFilter; const matchesSource = sourceFilter === "todos" || lead.origem === sourceFilter; const leadDate = new Date(lead.created_at); const matchesDate = leadDate >= prevDateRange.from! && leadDate <= prevDateRange.to!; return matchesStatus && matchesSource && matchesDate; }) : [];

        const calculateMetrics = (leads: Lead[]) => ({
            total: leads.length,
            hot: leads.filter(l => l.qualification_status === 'Quente').length,
            cold: leads.filter(l => l.qualification_status === 'Frio').length,
            warm: leads.filter(l => l.qualification_status === 'Morno').length,
            sales: leads.filter(l => l.qualification_status === 'Venda').length,
        });

        const currentMetrics = calculateMetrics(currentLeads);
        const prevMetrics = calculateMetrics(prevLeads);

        return {
            totalLeads: currentMetrics.total,
            deltaLeads: getDelta(currentMetrics.total, prevMetrics.total),
            hotLeads: currentMetrics.hot,
            deltaHot: getDelta(currentMetrics.hot, prevMetrics.hot),
            coldLeads: currentMetrics.cold,
            deltaCold: getDelta(currentMetrics.cold, prevMetrics.cold),
            warmLeads: currentMetrics.warm,
            deltaWarm: getDelta(currentMetrics.warm, prevMetrics.warm),
            sales: currentMetrics.sales,
            deltaSales: getDelta(currentMetrics.sales, prevMetrics.sales),
        };
    }, [filteredLeadsForCards, allLeads, dateRange, statusFilter, sourceFilter]);

    const handleLeadAdded = (newLead: Lead) => { /* A lógica de tempo real já cuida disso, mas podemos manter para otimismo */ };
    const handleQualificationChange = async (leadId: number, newQualification: QualificationStatus) => { const originalLeads = [...allLeads]; setAllLeads(currentLeads => currentLeads.map(lead => lead.id === leadId ? { ...lead, qualification_status: newQualification } : lead )); const { error } = await supabase.from('leads').update({ qualification_status: newQualification }).eq('id', leadId); if (error) { alert(`Erro ao atualizar o lead: ${error.message}`); setAllLeads(originalLeads); }};
    const handleRowSelect = (leadId: number) => { setSelectedRows(prev => prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]); };
    const handleSelectAll = (checked: boolean | 'indeterminate') => { if (checked === true) { setSelectedRows(filteredLeadsForTable.map(lead => lead.id)); } else { setSelectedRows([]); } };
    const handleBulkUpdate = async () => { if (!newBulkStatus || selectedRows.length === 0) return; const originalLeads = [...allLeads]; setAllLeads(prevLeads => prevLeads.map(lead => selectedRows.includes(lead.id) ? { ...lead, qualification_status: newBulkStatus } : lead )); const { error } = await supabase.from('leads').update({ qualification_status: newBulkStatus }).in('id', selectedRows); if (error) { alert(`Erro ao atualizar leads: ${error.message}`); setAllLeads(originalLeads); } setSelectedRows([]); setNewBulkStatus(null); setIsBulkEditDialogOpen(false); };


  return (
    // O container principal define o layout em duas colunas e a altura total da tela
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        {/* Cabeçalho do conteúdo com altura padrão, sem borda preta, fundo do tema */}
        <header className="flex items-center justify-between px-6 h-16 border-b bg-background">
          <div>
            <h1 className="text-xl font-bold">Painel de Leads</h1>
            <p className="text-sm text-muted-foreground">Visão geral do seu funil de vendas</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline">Configurações</Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Lead</DialogTitle>
                  <DialogDescription>Preencha as informações do novo lead abaixo.</DialogDescription>
                </DialogHeader>
                <NewLeadForm onLeadAdded={handleLeadAdded} onClose={() => setIsAddDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Área principal com scroll, ocupando o restante do espaço */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {error ? <p className="text-red-500">Erro ao carregar os dados: {error}</p> : (
            <>
              <StatsCards
                loading={initialLeads.length === 0 && !error}
                totalLeads={totalLeads} deltaLeads={deltaLeads}
                hotLeads={hotLeads} deltaHot={deltaHot}
                coldLeads={coldLeads} deltaCold={deltaCold}
                warmLeads={warmLeads} deltaWarm={deltaWarm}
                sales={sales} deltaSales={deltaSales}
              />
              
              {/* ===== ÁREA MODIFICADA ===== */}
              {/* Gráficos com proporção 60-40 em ecrãs grandes e com a mesma altura */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
                <div className="lg:col-span-3">
                  <LeadsByDayChart data={leadsByDayData} />
                </div>
                <div className="lg:col-span-2">
                  <LeadsBySourcePieChart leads={filteredLeadsForCards} />
                </div>
              </div>
              {/* ===== FIM DA ÁREA MODIFICADA ===== */}

              <Card>
                <CardHeader>
                  <CardTitle>Todos os Leads</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FilterBar
                    searchTerm={searchTerm} onSearchTermChange={setSearchTerm}
                    statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
                    sourceFilter={sourceFilter} onSourceFilterChange={setSourceFilter}
                    dateRange={dateRange} onDateChange={setDateRange}
                    selectedRowsCount={selectedRows.length}
                    isBulkEditDialogOpen={isBulkEditDialogOpen} onBulkEditOpenChange={setIsBulkEditDialogOpen}
                    onNewBulkStatusChange={setNewBulkStatus}
                    handleBulkUpdate={handleBulkUpdate} newBulkStatus={newBulkStatus}
                  />
                  <LeadsTable
                    loading={initialLeads.length === 0 && !error}
                    leads={sortedLeadsForTable}
                    selectedRows={selectedRows}
                    onRowSelect={(leadIds) => setSelectedRows(leadIds)}
                    onQualificationChange={handleQualificationChange}
                    onLeadClick={(lead) => setSelectedLead(lead)}
                    // 4. Passa o estado e função de ordenação para a tabela
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
      <LeadDetailSheet
        isOpen={!!selectedLead}
        onOpenChange={(isOpen) => { if (!isOpen) setSelectedLead(null); }}
        lead={selectedLead}
      />
    </div>
  );
}