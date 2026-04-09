import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';

import { motion } from 'framer-motion';
import { Coins, History, TrendingUp, Info } from 'lucide-react';
import api from '@/config/api';
import WalletCard from '../components/WalletCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function WalletPage() {
    const [wallet, setWallet] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [walletRes, historyRes] = await Promise.all([
                api.get('/api/wallet'),
                api.get('/api/wallet/transactions')
            ]);

            if (walletRes.data.success) setWallet(walletRes.data.data);
            if (historyRes.data.success) setHistory(historyRes.data.data);
        } catch (err) {
            console.error("Wallet data fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (

            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>

        );
    }

    return (

        <div className="flex-1 bg-background p-6">
            <div className="w-full">
                <div className="mb-6">
                    <h1 className="text-2xl xl:text-3xl font-semibold">My Wallet & Rewards</h1>
                    <p className="text-muted-foreground">Manage your coins and view transaction history</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-1">
                        <WalletCard wallet={wallet} showButton={false} />

                        <Card className="mt-6 border border-primary/10 bg-primary/5">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Info className="h-4 w-4 text-primary" />
                                    How it works
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs space-y-3 pb-6">
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="h-5">1</Badge>
                                    <p>Earn coins on every order*.</p>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="h-5">2</Badge>
                                    <p>Coins are credited after the order is successfully delivered.</p>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="h-5">3</Badge>
                                    <p>Redeem coins during checkout to get instant discounts.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="xl:col-span-2 space-y-6">
                        <Card className="h-full">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <History className="h-5 w-5 text-muted-foreground" />
                                    Transaction History
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {history.length === 0 ? (
                                    <div className="py-20 text-center text-muted-foreground">
                                        <p>No transactions yet.</p>
                                        <p className="text-sm mt-1">Place an order to start earning coins!</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border max-h-[400px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                        {history.map((tx) => (
                                            <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-full ${tx.coins > 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                                                        <TrendingUp className={`h-4 w-4 ${tx.coins < 0 ? 'rotate-180' : ''}`} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm">{tx.description}</p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {formatDate(tx.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`font-black text-sm ${tx.coins > 0 ? 'text-primary' : 'text-destructive'}`}>
                                                    {tx.coins > 0 ? '+' : ''}{tx.coins}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>

    );
}