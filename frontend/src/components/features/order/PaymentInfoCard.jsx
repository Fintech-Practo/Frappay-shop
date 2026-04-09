import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Calendar, Hash } from 'lucide-react'

export default function PaymentInfoCard({ payment }) {

    return (
        <Card className="border-green-200 dark:border-green-900 bg-card">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Payment Details
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm text-foreground">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Gateway</span>
                    <span className="font-semibold">{payment.gateway || (payment.payment_method === 'COD' ? 'Cash on Delivery' : 'N/A')}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID</span>
                    <span className="font-mono text-xs">{payment.gateway_transaction_id || 'N/A'}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                        {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 2,
                        }).format(payment.amount || 0)}
                    </span>
                </div>

                <div className="flex justify-between items-center">
                    <span>Status</span>
                    <Badge variant={payment.status === 'SUCCESS' || payment.status === 'PAID' ? 'default' : 'destructive'}>
                        {payment.status || 'PENDING'}
                    </Badge>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Date</span>
                    <span>{payment.date ? new Date(payment.date).toLocaleString() : 'N/A'}</span>
                </div>
            </CardContent>
        </Card>
    )
}