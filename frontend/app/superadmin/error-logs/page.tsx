'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { Loader2, RefreshCw, AlertTriangle, Eye, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout';
import { getAuthHeader } from '@/utils/auth';
import { exportToCSV } from '@/utils/exportUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

interface ErrorLog {
    _id: string;
    route: string;
    frontend_page: string;
    backend_route: string;
    payload: any;
    filter: any;
    error_message: string;
    error_code: string;
    http_status?: number | null;
    timestamp: string;
    ip_address: string;
}

/** Badge label + colors for an error log. Legacy rows have code UNKNOWN_ERROR
 *  and no http_status — show them as a neutral "ERROR" instead of shouting. */
function errorBadge(log: ErrorLog): { label: string; className: string } {
    const code = log.error_code && log.error_code !== 'UNKNOWN_ERROR' ? log.error_code : ''
    const status = log.http_status ?? null
    const label = code && status ? `${status} ${code}` : code || (status ? `HTTP ${status}` : 'ERROR')
    // 4xx = client/auth (amber), 5xx = server fault (red), unknown = gray
    const cls = status && status >= 500
        ? 'text-red-600 border-red-200 bg-red-50'
        : status && status >= 400
            ? 'text-amber-700 border-amber-200 bg-amber-50'
            : code
                ? 'text-red-600 border-red-200 bg-red-50'
                : 'text-gray-500 border-gray-200 bg-gray-50'
    return { label, className: cls }
}

export default function ErrorLogsPage() {
    const [logs, setLogs] = useState<ErrorLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [totalRecords, setTotalRecords] = useState(0);

    // Filters: search matches route or error message; date range on timestamp
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const buildFilter = () => {
        const filter: any = {};
        if (search.trim()) {
            const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { route: { $regex: escaped, $options: 'i' } },
                { error_message: { $regex: escaped, $options: 'i' } },
            ];
        }
        if (dateFrom || dateTo) {
            filter.timestamp = {};
            if (dateFrom) filter.timestamp.$gte = new Date(dateFrom).toISOString();
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                filter.timestamp.$lte = end.toISOString();
            }
        }
        return filter;
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Auth is stored as a JSON blob — use the shared helper, not a raw
            // 'token' key (the old code sent "Bearer null" and always 401'd).
            const authHeader = getAuthHeader();
            if (!authHeader) {
                setLoading(false);
                return;
            }
            const skip = (currentPage - 1) * pageSize;

            const response = await fetch(`${API_BASE_URL}/superadmin/error-logs/list`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({
                    filter: buildFilter(),
                    options: {
                        limit: Number(pageSize),
                        skip: skip,
                        sort: { timestamp: -1 },
                        count: true // total matching records, for correct page count
                    },
                    projection: { error_stack: 0 }
                })
            });

            const data = await response.json();
            if (data.success) {
                setLogs(data.data || []);
                if (typeof data.count === 'number') {
                    setTotalRecords(data.count);
                }
            } else {
                console.error('Failed to fetch error logs:', data.message);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter changes restart at page 1
    useEffect(() => {
        setCurrentPage(1);
    }, [search, dateFrom, dateTo]);

    useEffect(() => {
        fetchLogs();
    }, [currentPage, pageSize, search, dateFrom, dateTo]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

    const handlePrevious = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage(p => p + 1);
    };

    /** Export the current page of logs (with active filters applied) as CSV */
    const handleExportCSV = () => {
        if (logs.length === 0) return;
        const rows = logs.map((log) => ({
            timestamp: log.timestamp,
            error_code: log.error_code || '',
            http_status: log.http_status ?? '',
            route: log.route || '',
            backend_route: log.backend_route || '',
            frontend_page: log.frontend_page || '',
            error_message: log.error_message || '',
            ip_address: log.ip_address || '',
        }));
        exportToCSV(rows, `error_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    return (
        <SuperadminLayout>
        <div className="container mx-auto py-8 px-4 space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                        System Error Logs
                    </h1>
                    <p className="text-gray-500 mt-2">Monitor and debug system errors</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportCSV} variant="secondary" className="gap-2" disabled={logs.length === 0}>
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button onClick={fetchLogs} variant="secondary" className="gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Refresh
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50/50 flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <h2 className="text-lg font-semibold text-gray-800">Recent Errors</h2>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-2">
                            {totalRecords} Total
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search route or message..."
                                className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-56 focus:outline-none focus:border-red-400"
                            />
                        </div>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            max={dateTo || undefined}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
                            title="From date"
                        />
                        <span className="text-gray-400 text-sm">to</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            min={dateFrom || undefined}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
                            title="To date"
                        />
                        {(search || dateFrom || dateTo) && (
                            <button
                                onClick={() => { setSearch(''); setDateFrom(''); setDateTo('') }}
                                className="text-xs text-gray-400 hover:text-red-500"
                                title="Clear filters"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 whitespace-nowrap">Time</th>
                                <th className="px-6 py-3">Error Message</th>
                                <th className="px-6 py-3">Route</th>
                                <th className="px-6 py-3">Frontend Page</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-gray-500">
                                        <div className="flex flex-col justify-center items-center gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                                            <span>Loading logs...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs && logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log._id} className="bg-white hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-xs text-gray-500 w-[180px]">
                                            {formatDate(log.timestamp)}
                                        </td>
                                        <td className="px-6 py-4 max-w-[300px]">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold border px-1.5 py-0.5 rounded ${errorBadge(log).className}`}>
                                                        {errorBadge(log).label}
                                                    </span>
                                                </div>
                                                <span className="truncate text-gray-700" title={log.error_message}>
                                                    {log.error_message}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-[200px]">
                                            <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded truncate block" title={log.backend_route}>
                                                {log.backend_route || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-[200px]">
                                            {log.frontend_page ? (
                                                <a href={log.frontend_page} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block" title={log.frontend_page}>
                                                    {(() => {
                                                        try {
                                                            return new URL(log.frontend_page).pathname;
                                                        } catch {
                                                            return log.frontend_page;
                                                        }
                                                    })()}
                                                </a>
                                            ) : <span className="text-xs text-gray-400">N/A</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                onClick={() => setSelectedLog(log)}
                                                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                                                title="View Details"
                                            >
                                                <Eye className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-gray-500 bg-white">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-3 bg-gray-100 rounded-full">
                                                <RefreshCw className="h-6 w-6 text-gray-400" />
                                            </div>
                                            <p>No error logs found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 hidden sm:inline">Rows per page:</span>
                        <FilterSelect
                            value={String(pageSize)}
                            onChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}
                            widthClass="w-24"
                            options={[
                                { value: '10', label: '10' },
                                { value: '25', label: '25' },
                                { value: '50', label: '50' },
                                { value: '100', label: '100' },
                            ]}
                        />
                    </div>

                    <div className="flex items-center gap-2 sm:gap-6">
                        <span className="text-sm text-gray-600">
                            Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                        </span>
                        <div className="flex gap-1">
                            <Button
                                variant="secondary"
                                onClick={handlePrevious}
                                disabled={currentPage <= 1 || loading}
                                className="h-8 w-8 p-0"
                                title="Previous Page"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleNext}
                                disabled={currentPage >= totalPages || loading}
                                className="h-8 w-8 p-0"
                                title="Next Page"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                title="Error Details"
                size="xl"
            >
                {selectedLog && (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                        {/* Header Info */}
                        <div className="bg-gray-50 p-4 rounded-lg border grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Timestamp</span>
                                <div className="font-mono text-gray-700">{formatDate(selectedLog.timestamp)}</div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">IP Address</span>
                                <div className="font-mono text-gray-700">{selectedLog.ip_address || 'N/A'}</div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Error Code</span>
                                <div className="text-red-600 font-bold font-mono">{errorBadge(selectedLog).label}</div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Route</span>
                                <div className="font-mono bg-white border px-2 py-1 rounded w-fit text-xs break-all">{selectedLog.route}</div>
                            </div>
                        </div>

                        {/* Error Message */}
                        <div>
                            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider block mb-2">Error Message</span>
                            <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm font-medium break-words leading-relaxed shadow-sm">
                                {selectedLog.error_message}
                            </div>
                        </div>

                        {/* Request Payload */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider block">Payload (Request Body)</span>
                                <span className="text-xs text-gray-400">JSON</span>
                            </div>
                            <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-inner">
                                <pre className="p-4 overflow-x-auto text-xs font-mono text-blue-100 max-h-[300px]">
                                    {JSON.stringify(selectedLog.payload, null, 2)}
                                </pre>
                            </div>
                        </div>

                        {/* Filter/Query */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider block">Filter / Query</span>
                                <span className="text-xs text-gray-400">JSON</span>
                            </div>
                            <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-inner">
                                <pre className="p-4 overflow-x-auto text-xs font-mono text-green-100 max-h-[200px]">
                                    {JSON.stringify(selectedLog.filter, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
        </SuperadminLayout>
    );
}
