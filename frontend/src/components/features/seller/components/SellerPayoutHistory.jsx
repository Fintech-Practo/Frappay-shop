import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IndianRupee, AlertCircle } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useState, useEffect } from 'react';

export default function SellerPayoutHistory({
    payouts = [],
    stats = {},
    formatPrice,
    handleExportCSV,
    pagination = { page: 1, limit: 10, totalPages: 1 },
    onPageChange
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="font-display text-2xl font-bold text-foreground">
                    Payout History
                </h1>

                <Badge
                    variant="outline"
                    className="bg-orange-500/10 text-orange-600 border-orange-200"
                >
                    Owed: {formatPrice(stats?.pendingPayout || 0)}
                </Badge>
            </div>

            {/* Table Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Recent Settlements</CardTitle>
                        <CardDescription>
                            Track your earnings and settlement status per order
                        </CardDescription>
                    </div>

                    <Button variant="outline" size="sm" onClick={handleExportCSV}>
                        Export CSV
                    </Button>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-secondary/20">
                                    <th className="text-left py-4 px-6 font-medium">Payout ID</th>
                                    <th className="text-left py-4 px-6 font-medium">Order</th>
                                    <th className="text-left py-4 px-6 font-medium">Amount</th>
                                    <th className="text-left py-4 px-6 font-medium">Due Date</th>
                                    <th className="text-left py-4 px-6 font-medium">Status</th>
                                    <th className="text-left py-4 px-6 font-medium">Created</th>
                                    <th className="text-left py-4 px-6 font-medium">Settled At</th>
                                    <th className="text-left py-4 px-6 font-medium">Transaction ID</th>
                                </tr>
                            </thead>

                            <tbody>
                                {payouts.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="py-12 text-center text-muted-foreground"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <IndianRupee className="h-8 w-8 opacity-20" />
                                                <p>No payout history available yet.</p>
                                                <p className="text-xs">
                                                    Payouts are generated once orders are successfully paid.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    payouts.map((payout) => (
                                        <tr
                                            key={payout.id}
                                            className="border-b border-border hover:bg-muted/30 transition-colors"
                                        >
                                            {/* Payout ID */}
                                            <td className="py-4 px-6 font-mono text-[10px]">
                                                {payout.id}
                                            </td>

                                            {/* Order */}
                                            <td className="py-4 px-6 font-medium">
                                                #{payout.order_id}
                                            </td>

                                            {/* Amount */}
                                            <td className="py-4 px-6 font-bold">
                                                {formatPrice(payout.amount)}
                                            </td>

                                            {/* Due Date */}
                                            <td className="py-4 px-6">
                                                {payout.due_date ? (
                                                  <div className="flex flex-col">
                                                    <span className="font-medium">{formatDate(payout.due_date)}</span>
                                                    {new Date(payout.due_date) > new Date() && (
                                                      <span className="text-[10px] text-orange-600 font-normal">
                                                        ({Math.ceil((new Date(payout.due_date) - new Date()) / (1000 * 60 * 60 * 24))} days left)
                                                      </span>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <span className="text-muted-foreground italic">Waiting for Delivery</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="py-4 px-6">
                                                <Badge
                                                    className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] border",
                                                        payout.status === 'settled'
                                                            ? "bg-green-500/10 text-green-600 border-green-200"
                                                            : payout.status === 'failed'
                                                                ? "bg-red-500/10 text-red-600 border-red-200"
                                                                : payout.status === 'processing'
                                                                    ? "bg-blue-500/10 text-blue-600 border-blue-200"
                                                                    : "bg-orange-500/10 text-orange-600 border-orange-200"
                                                    )}
                                                >
                                                    {(payout.status || 'PENDING').toUpperCase()}
                                                </Badge>
                                            </td>

                                            {/* Created */}
                                            <td className="py-4 px-6 text-muted-foreground">
                                                {formatDate(payout.created_at)}
                                            </td>

                                            {/* Settled */}
                                            <td className="py-4 px-6 text-muted-foreground">
                                                {payout.settled_at
                                                    ? formatDate(payout.settled_at)
                                                    : '-'}
                                            </td>

                                            {/* Transaction */}
                                            <td className="py-4 px-6 font-mono text-xs">
                                                {payout.transaction_id || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                        Showing page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Footer Note */}
            <div className="mt-4 p-4 border rounded-lg bg-primary/10 border-border flex gap-3 text-xs text-primary">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>
                    Settlements are processed weekly. If you have any discrepancy,
                    contact support.
                </p>
            </div>
        </motion.div>
    );
}