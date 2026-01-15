import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Commented out - not needed since we only use auto-payouts now
// import { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { ArrowDown, AlertCircle } from 'lucide-react';
// import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { toast } from 'sonner';
// import {
//     AlertDialog,
//     AlertDialogAction,
//     AlertDialogCancel,
//     AlertDialogContent,
//     AlertDialogDescription,
//     AlertDialogFooter,
//     AlertDialogHeader,
//     AlertDialogTitle,
// } from "@/components/ui/alert-dialog";

const MINIMUM_AUTO_PAYOUT = 250;
// const MINIMUM_MANUAL_PAYOUT = 250;
// const PAYOUT_FEE = 100;

interface VendorBalance {
    pending_balance: number;
    total_earned: number;
    total_paid_out: number;
    last_payout_at: string | null;
}

export function VendorBalanceCard({ vendorId }: { vendorId: string }) {
    // const [showManualPayoutDialog, setShowManualPayoutDialog] = useState(false);
    // const queryClient = useQueryClient();

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
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Manual payout mutation - commented out, using auto-payouts only
    // const manualPayout = useMutation({
    //     mutationFn: async () => {
    //         const { data, error } = await supabase.functions.invoke('request-manual-payout', {
    //             body: { vendor_id: vendorId },
    //         });
    //         if (error) throw error;
    //         return data;
    //     },
    //     onSuccess: (data) => {
    //         toast.success("Payout Requested!", {
    //             description: `KES ${data.amount.toLocaleString()} will be sent to your M-Pesa shortly.`,
    //         });
    //         queryClient.invalidateQueries({ queryKey: ['vendor-balance'] });
    //         queryClient.invalidateQueries({ queryKey: ['payouts'] });
    //         setShowManualPayoutDialog(false);
    //     },
    //     onError: (error: any) => {
    //         toast.error("Payout Failed", {
    //             description: error.message || 'Failed to process payout',
    //         });
    //     },
    // });

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">Loading balance...</div>
                </CardContent>
            </Card>
        );
    }

    const pendingBalance = balance?.pending_balance || 0;
    const totalEarned = balance?.total_earned || 0;
    const totalPaidOut = balance?.total_paid_out || 0;
    const progressPercentage = Math.min(100, (pendingBalance / MINIMUM_AUTO_PAYOUT) * 100);
    const amountNeeded = Math.max(0, MINIMUM_AUTO_PAYOUT - pendingBalance);
    // const canManualPayout = pendingBalance >= MINIMUM_MANUAL_PAYOUT;
    // const manualPayoutNet = pendingBalance - PAYOUT_FEE;

    return (
        <Card className="border-2 shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Pending Balance
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Balance Display */}
                <div className="text-center">
                    <p className="text-4xl font-bold text-primary">
                        KES {pendingBalance.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            <span>Total earned: KES {totalEarned.toLocaleString()}</span>
                        </div>
                    </div>
                    {totalPaidOut > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Paid out: KES {totalPaidOut.toLocaleString()}
                        </p>
                    )}
                </div>

                {/* Progress to Auto Payout */}
                {pendingBalance < MINIMUM_AUTO_PAYOUT && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress to auto-payout</span>
                            <span className="font-medium">{progressPercentage.toFixed(0)}%</span>
                        </div>
                        <Progress value={progressPercentage} className="h-3" />
                        <p className="text-sm text-muted-foreground">
                            KES {amountNeeded.toLocaleString()} more needed for automatic payout
                        </p>
                    </div>
                )}

                {/* Auto Payout Notice */}
                {pendingBalance >= MINIMUM_AUTO_PAYOUT && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                            🎉 Your balance will trigger an automatic payout soon!
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                            Funds will be sent to your M-Pesa automatically.
                        </p>
                    </div>
                )}

                {/* Manual Payout Button - commented out, using auto-payouts only
                {canManualPayout && pendingBalance < MINIMUM_AUTO_PAYOUT && (
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowManualPayoutDialog(true)}
                    >
                        <ArrowDown className="h-4 w-4 mr-2" />
                        Request Payout Now
                    </Button>
                )}
                */}
            </CardContent>
        </Card>
    );

    /* Manual Payout Confirmation Dialog - commented out, using auto-payouts only
    return (
        <>
            {cardContent}
            <AlertDialog open={showManualPayoutDialog} onOpenChange={setShowManualPayoutDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Request Early Payout?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <div className="bg-muted rounded-lg p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span>Current balance:</span>
                                    <span className="font-medium">KES {pendingBalance.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-red-600 dark:text-red-400">
                                    <span>Processing fee:</span>
                                    <span className="font-medium">- KES {PAYOUT_FEE}</span>
                                </div>
                                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                                    <span>You will receive:</span>
                                    <span className="text-green-600 dark:text-green-400">
                                        KES {manualPayoutNet.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Funds will be sent to your M-Pesa number within minutes.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => manualPayout.mutate()}
                            disabled={manualPayout.isPending}
                        >
                            {manualPayout.isPending ? 'Processing...' : 'Proceed with Payout'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
    */
}
