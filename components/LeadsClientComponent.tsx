// components/LeadsClientComponent.tsx

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { addDays, startOfDay, endOfDay, startOfMonth, endOfYear, differenceInDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from '@/components/AppSidebar';
import { LeadsTable } from '@/components/LeadsTable';
import { StatsCards } from '@/components/StatsCards';
import { FilterBar } from "@/components/FilterBar";
import { NewLeadForm } from './NewLeadForm';
import { supabase } from "../supabaseClient";
import { Lead, QualificationStatus, SortConfig } from "@/app/page";
import { LeadsBySourcePieChart } from './LeadsBySourcePieChart';
import { LeadsByDayChart } from './LeadsByDayChart';
import { format } from 'date-fns';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface LeadsClientComponentProps {
  initialLeads: Lead[];
  serverError?: string;
}

export default function LeadsClientComponent({ initialLeads, serverError }: LeadsClientComponentProps) {
    const [allLeads, setAllLeads] = useState<Lead[]>(initialLeads);
    const [error, setError] = useState<string | null>(serverError || null);
    
    useEffect(() => {
        setAllLeads(initialLeads);
    }, [initialLeads]);
    
    useEffect(() => {
        const channel = supabase.channel('leads-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'leads' },
                (payload) => {
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

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("todos");
    const [sourceFilter, setSourceFilter] = useState("todos");
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfDay(new Date()) });
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
    const [newBulkStatus, setNewBulkStatus] = useState<QualificationStatus | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        column: "created_at",
        direction: "desc",
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

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

    const leadsWithOrigin = useMemo(() => allLeads.map(lead => ({ ...lead, origem: getStandardizedOrigin((lead as any).source, (lead as any).utm_source) })), [allLeads]);
    
    const filteredLeads = useMemo(() => {
        return leadsWithOrigin.filter((lead) => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = (lead.name?.toLowerCase() || '').includes(searchLower);
            const matchesStatus = statusFilter === "todos" || lead.qualification_status === statusFilter;
            const matchesSource = sourceFilter === "todos" || lead.origem === sourceFilter;
            let matchesDate = true;
            if (dateRange?.from) {
                const leadDate = lead.created_at ? new Date(lead.created_at) : null;
                const fromDate = startOfDay(dateRange.from);
                const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
                matchesDate = leadDate ? leadDate >= fromDate && leadDate <= toDate : false;
            }
            return matchesSearch && matchesStatus && matchesSource && matchesDate;
        });
    }, [leadsWithOrigin, searchTerm, statusFilter, sourceFilter, dateRange]);

    const sortedLeads = useMemo(() => {
        const leads = [...filteredLeads];
        leads.sort((a, b) => {
            const col = sortConfig.column;
            let aValue = (a as any)[col];
            let bValue = (b as any)[col];
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
    }, [filteredLeads, sortConfig]);

    const totalPages = useMemo(() => Math.ceil(sortedLeads.length / itemsPerPage), [sortedLeads, itemsPerPage]);
    const paginatedLeads = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedLeads.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedLeads, currentPage, itemsPerPage]);

    const { totalLeads, deltaLeads, hotLeads, deltaHot, coldLeads, deltaCold, warmLeads, deltaWarm, sales, deltaSales } = useMemo(() => {
        const getDelta = (current: number, prev: number) => { if (prev === 0) return current > 0 ? "100.0" : "0.0"; const delta = (((current - prev) / prev) * 100); return delta.toFixed(1); }
        const getPreviousPeriodRange = (): DateRange | undefined => { if (!dateRange || !dateRange.from) return undefined; const from = dateRange.from; const to = dateRange.to ?? from; const diff = differenceInDays(to, from); const prevTo = addDays(from, -1); const prevFrom = addDays(prevTo, -diff); return { from: startOfDay(prevFrom), to: endOfDay(prevTo) }; }
        
        const currentPeriodLeads = filteredLeads;
        
        const prevDateRange = getPreviousPeriodRange();
        const previousPeriodLeads = prevDateRange ? allLeads.filter(lead => { const leadDate = new Date(lead.created_at); return leadDate >= prevDateRange.from! && leadDate <= prevDateRange.to!; }) : [];

        const calculateMetrics = (leads: Lead[]) => ({
            total: leads.length,
            hot: leads.filter(l => l.qualification_status === 'Quente').length,
            cold: leads.filter(l => l.qualification_status === 'Frio').length,
            warm: leads.filter(l => l.qualification_status === 'Morno').length,
            sales: leads.filter(l => l.qualification_status === 'Venda').length,
        });

        const currentMetrics = calculateMetrics(currentPeriodLeads);
        const prevMetrics = calculateMetrics(previousPeriodLeads);

        return {
            totalLeads: currentMetrics.total, deltaLeads: getDelta(currentMetrics.total, prevMetrics.total),
            hotLeads: currentMetrics.hot, deltaHot: getDelta(currentMetrics.hot, prevMetrics.hot),
            coldLeads: currentMetrics.cold, deltaCold: getDelta(currentMetrics.cold, prevMetrics.cold),
            warmLeads: currentMetrics.warm, deltaWarm: getDelta(currentMetrics.warm, prevMetrics.warm),
            sales: currentMetrics.sales, deltaSales: getDelta(currentMetrics.sales, prevMetrics.sales)
        };
    }, [filteredLeads, allLeads, dateRange]);


    const handleSort = (column: keyof Lead) => {
      setSortConfig(current => ({
        column,
        direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc'
      }));
    };
    
    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleQualificationChange = async (leadId: number, newQualification: QualificationStatus) => {
      const originalLeads = [...allLeads];
      setAllLeads(currentLeads => currentLeads.map(lead => lead.id === leadId ? { ...lead, qualification_status: newQualification } : lead ));
      const { error } = await supabase.from('leads').update({ qualification_status: newQualification }).eq('id', leadId);
      if (error) {
          alert(`Erro ao atualizar o lead: ${error.message}`);
          setAllLeads(originalLeads);
      }
    };
    
    return (
        <div className="flex h-screen bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex items-center justify-between px-6 h-16 border-b bg-background">
                    <div>
                        <h1 className="text-xl font-bold">Painel de Leads</h1>
                        <p className="text-sm text-muted-foreground">Visão geral do seu funil de vendas</p>
                    </div>
                    <div className="flex gap-4">
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Novo Lead</Button></DialogTrigger>
                            <DialogContent className="sm:max-w-[550px]">
                                <DialogHeader><DialogTitle>Adicionar Novo Lead</DialogTitle><DialogDescription>Preencha as informações do novo lead.</DialogDescription></DialogHeader>
                                <NewLeadForm onLeadAdded={() => {}} onClose={() => setIsAddDialogOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </header>

                <main className="flex-1 p-6 space-y-6 overflow-y-auto">
                   <StatsCards
                        loading={initialLeads.length === 0 && !error}
                        totalLeads={totalLeads} deltaLeads={deltaLeads}
                        hotLeads={hotLeads} deltaHot={deltaHot}
                        coldLeads={coldLeads} deltaCold={deltaCold}
                        warmLeads={warmLeads} deltaWarm={deltaWarm}
                        sales={sales} deltaSales={deltaSales}
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
                        <div className="lg:col-span-3">
                            <LeadsByDayChart data={useMemo(() => {
                                const leadsByDay = filteredLeads.reduce((acc, lead) => {
                                    const date = format(new Date(lead.created_at), 'yyyy-MM-dd');
                                    acc[date] = (acc[date] || 0) + 1;
                                    return acc;
                                }, {} as Record<string, number>);
                                
                                return Object.entries(leadsByDay).map(([date, leads]) => ({
                                    date,
                                    leads
                                }));
                            }, [filteredLeads])} />
                        </div>
                        <div className="lg:col-span-2">
                            <LeadsBySourcePieChart leads={filteredLeads} />
                        </div>
                    </div>
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
                                onBulkEditOpenChange={setIsBulkEditDialogOpen}
                                onNewBulkStatusChange={setNewBulkStatus}
                                handleBulkUpdate={() => {}} newBulkStatus={newBulkStatus}
                                isBulkEditDialogOpen={isBulkEditDialogOpen}
                            />
                            <LeadsTable
                                loading={initialLeads.length === 0 && !error}
                                leads={paginatedLeads}
                                selectedRows={selectedRows}
                                onRowSelect={setSelectedRows}
                                onQualificationChange={handleQualificationChange}
                                onLeadClick={(lead) => {
                                    // Ação de clique desativada por enquanto
                                    setSelectedLead(lead);
                                    console.log("Lead selecionado:", lead);
                                }}
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            {totalPages > 1 && (
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''} />
                                        </PaginationItem>
                                        {[...Array(totalPages).keys()].map(page => (
                                            <PaginationItem key={page + 1}>
                                                <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(page + 1); }} isActive={currentPage === page + 1}>{page + 1}</PaginationLink>
                                            </PaginationItem>
                                        ))}
                                        <PaginationItem>
                                            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            )}
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}