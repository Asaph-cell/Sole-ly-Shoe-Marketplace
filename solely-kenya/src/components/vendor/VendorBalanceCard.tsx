import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowDownToLine, TrendingUp, History, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VendorBalance {
    pending_balance: number | null;
    total_earned: number | null;
    total_paid_out: number | null;
    last_payout_at: string | null;
    intasend_wallet_id?: string | null;
}

export function VendorBalanceCard({ vendorId }: { vendorId: string }) {
    const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
    const queryClient = useQueryClient();

    // Fetch balance
    const { data: balance, isLoading } = useQuery<VendorBalance>({
        queryKey: ['vendor-balance', vendorId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vendor_balances')
                .select('*')
                .eq('vendor_id', vendorId)
                .single();

            if (error) {
                // Create balance record if it doesn't exist
                if (error.code === 'PGRST116') {
                    const { data: newBalance, error: createError } = await supabase
                        .from('vendor_balances')
                        .insert({ vendor_id: vendorId })
                        .select()
                        .single();

                    if (createError) throw createError;
                    return newBalance;
                }
                throw error;
            }
            return data;
        },
        refetchInterval: 30000,
    });

    // Withdrawal mutation
    const withdraw = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke('vendor-withdraw', {
                body: { vendor_id: vendorId },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
            return data;
        },
        onSuccess: (data) => {
            toast.success("Withdrawal Successful! 🎉", {
                description: data.message || `KES ${data.amount?.toLocaleString()} sent to your M-Pesa!`,
            });
            queryClient.invalidateQueries({ queryKey: ['vendor-balance'] });
            queryClient.invalidateQueries({ queryKey: ['payouts'] });
            setShowWithdrawDialog(false);
        },
        onError: (error: Error) => {
            toast.error("Withdrawal Failed", {
                description: error.message || 'Failed to process withdrawal',
            });
        },
    });

    if (isLoading) {
        return (
            <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl">
                <CardContent className="p-6">
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const pendingBalance = balance?.pending_balance || 0;
    const totalEarned = balance?.total_earned || 0;
    const totalPaidOut = balance?.total_paid_out || 0;
    const canWithdraw = pendingBalance > 0;

    return (
        <>
            <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl overflow-hidden">
                <CardContent className="p-0">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 px-6 py-4 border-b border-white/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-500/20 p-2 rounded-lg">
                                    <Wallet className="h-5 w-5 text-emerald-400" />
                                </div>
                                <span className="font-semibold text-white/90">Wallet Balance</span>
                            </div>
                        </div>
                    </div>

                    {/* Balance Display */}
                    <div className="px-6 py-8 text-center">
                        <p className="text-5xl font-bold text-emerald-400 tracking-tight">
                            KES {pendingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-white/60 text-sm mt-2">
                            Available for withdrawal
                        </p>
                    </div>

                    {/* Withdraw Button */}
                    <div className="px-6 pb-6">
                        <Button
                            onClick={() => setShowWithdrawDialog(true)}
                            disabled={!canWithdraw || withdraw.isPending}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 text-lg shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {withdraw.isPending ? (
                                <>
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <ArrowDownToLine className="h-5 w-5 mr-2" />
                                    Withdraw to M-Pesa
                                </>
                            )}
                        </Button>
                        {!canWithdraw && (
                            <p className="text-white/40 text-xs text-center mt-3">
                                No balance available for withdrawal
                            </p>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="border-t border-white/10 px-6 py-4 grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-400" />
                            <div>
                                <p className="text-white/50 text-xs">Total Earned</p>
                                <p className="text-white font-medium">KES {totalEarned.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <History className="h-4 w-4 text-blue-400" />
                            <div>
                                <p className="text-white/50 text-xs">Total Withdrawn</p>
                                <p className="text-white font-medium">KES {totalPaidOut.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Withdrawal Confirmation Dialog */}
            <AlertDialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Withdrawal</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <div className="bg-muted rounded-lg p-4 text-center">
                                    <p className="text-sm text-muted-foreground">You will receive</p>
                                    <p className="text-3xl font-bold text-foreground mt-1">
                                        KES {pendingBalance.toLocaleString()}
                                    </p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Funds will be sent to your registered M-Pesa number instantly.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={withdraw.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => withdraw.mutate()}
                            disabled={withdraw.isPending}
                            className="bg-emerald-500 hover:bg-emerald-600"
                        >
                            {withdraw.isPending ? 'Processing...' : 'Withdraw Now'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
