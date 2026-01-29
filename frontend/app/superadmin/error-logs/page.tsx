'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Loader2, RefreshCw, AlertTriangle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

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
    timestamp: string;
    ip_address: string;
}

export default function ErrorLogsPage() {
    const [logs, setLogs] = useState<ErrorLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [totalRecords, setTotalRecords] = useState(0);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const skip = (currentPage - 1) * pageSize;

            const response = await fetch(`${API_BASE_URL}/superadmin/error-logs/list`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    options: {
                        limit: Number(pageSize),
                        skip: skip,
                        sort: { timestamp: -1 }
                    },
                    projection: { error_stack: 0 }
                })
            });

            const data = await response.json();
            if (data.success) {
                setLogs(data.data);
                if (data.count !== undefined) {
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

    useEffect(() => {
        fetchLogs();
    }, [currentPage, pageSize]);

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

    return (
        <div className="container mx-auto py-8 px-4 space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                        System Error Logs
                    </h1>
                    <p className="text-gray-500 mt-2">Monitor and debug system errors</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={fetchLogs} variant="secondary" className="gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Refresh
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <h2 className="text-lg font-semibold text-gray-800">Recent Errors</h2>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-2">
                            {totalRecords} Total
                        </span>
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
                                                    <span className="text-xs font-bold text-red-600 border border-red-200 bg-red-50 px-1.5 py-0.5 rounded">
                                                        {log.error_code || 'Error'}
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
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1); // Reset to first page
                            }}
                            className="text-sm border rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
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
                                <div className="text-red-600 font-bold font-mono">{selectedLog.error_code}</div>
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
    );
}
