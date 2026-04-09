import api from '../config/api';

/**
 * Format a raw refund item from the backend into a clean UI model.
 * Handles status normalization, timeline preparation, and logic for labels.
 */
export const formatRefund = (item) => {
    const status = (item.status || 'pending').toLowerCase();
    
    // Timeline Logic: Calculate which steps are completed
    // Requested (created_at) -> Approved (rto_completed_at) -> Processing (refund_initiated_at) -> Settled (refund_settled_at)
    
    const timeline = [
        {
            label: 'Requested',
            date: item.created_at,
            isCompleted: true,
            description: 'Refund request initiated'
        },
        {
            label: 'Approved',
            date: item.rto_completed_at,
            isCompleted: !!item.rto_completed_at,
            description: 'Item received & refund approved'
        },
        {
            label: 'Processing',
            date: item.refund_initiated_at,
            isCompleted: !!item.refund_initiated_at || status === 'settled',
            description: 'Payment being processed'
        },
        {
            label: 'Settled',
            date: item.refund_settled_at,
            isCompleted: status === 'settled',
            description: 'Funds sent to your account'
        }
    ];

    // Determine current step index for progress bar (0 to 3)
    let currentStep = 0;
    if (status === 'settled') currentStep = 3;
    else if (item.refund_initiated_at || status === 'processing' || status === 'retrying') currentStep = 2;
    else if (item.rto_completed_at || item.status === 'RTO_COMPLETED') currentStep = 1;

    return {
        id: item.refund_id || `RET-${item.return_id}`,
        refundId: item.refund_id ? `RF-${String(item.refund_id).padStart(5, '0')}` : `RT-${String(item.return_id).padStart(5, '0')}`,
        orderId: item.order_id,
        invoiceNumber: item.invoice_number,
        status: status.toUpperCase(),
        amount: parseFloat(item.amount || item.original_amount || 0),
        originalAmount: parseFloat(item.original_amount || 0),
        deduction: parseFloat(item.original_amount || 0) - parseFloat(item.amount || item.original_amount || 0),
        type: item.return_id ? 'RETURN' : 'CANCELLATION',
        reason: item.return_reason || item.reason || 'N/A',
        transactionId: item.gateway_refund_id || null,
        timeline,
        currentStep,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        expectedSettlement: item.expected_settlement,
        isFailed: status === 'failed',
        canRetry: status === 'failed'
    };
};

/**
 * Fetch paginated refunds with optional filters
 */
export const getMyRefunds = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams({
            page: params.page || 1,
            limit: params.limit || 10,
            status: params.status || 'all',
            type: params.type || 'all'
        });

        const response = await api.get(`/api/returns/my/refunds?${queryParams.toString()}`);
        
        if (response.data.success) {
            const { items, pagination } = response.data.data;
            return {
                refunds: items.map(formatRefund),
                pagination
            };
        }
        throw new Error(response.data.message || 'Failed to fetch refunds');
    } catch (error) {
        console.error('Error in getMyRefunds:', error);
        throw error;
    }
};

export default {
    getMyRefunds,
    formatRefund
};
