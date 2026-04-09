import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Coins, TrendingUp, History, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function WalletCard({ wallet, onRedeem, showButton = true }) {
    if (!wallet) return null;

    return (
        <Card className="relative overflow-hidden border border-border bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 dark:bg-muted dark:bg-none">
            {/* Decorative background circles */}
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-3xl dark:hidden" />
            <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-primary/10 blur-3xl dark:hidden" />

            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        My Wallet
                    </CardTitle>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full border border-border">
                            <Coins className="h-4 w-4 text-primary" />
                            <span className="text-sm font-bold text-primary">{wallet.coins || 0} Coins</span>
                        </div>
                        {wallet.locked_coins > 0 && (
                            <span className="text-[10px] text-muted-foreground font-medium mt-1">
                                {wallet.locked_coins} Locked
                            </span>
                        )}
                    </div>
                </div>
                <CardDescription className="text-muted-foreground">
                    Earn rewards on every purchase
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-4">
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Equivalent Value</p>
                        <h2 className="text-4xl font-black text-foreground flex items-baseline gap-1">
                            <span className="text-2xl">₹</span>
                            {(wallet.value || 0).toFixed(2)}                        </h2>
                    </div>
                    {showButton && (
                        <Button
                            size="sm"
                            onClick={onRedeem}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-md group"
                        >
                            Use Now
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                        <span>Progress to Next Tier</span>
                        <span>75%</span>
                    </div>
                    <Progress value={75} className="h-1.5 bg-muted [&>div]:bg-primary" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-muted rounded-xl border border-border backdrop-blur-sm">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Lifetime Earned</p>
                        <p className="text-lg font-bold text-foreground">{wallet.total_earned || 0}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-xl border border-border backdrop-blur-sm">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Redeemed</p>
                        <p className="text-lg font-bold text-foreground">{wallet.total_redeemed || 0}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}