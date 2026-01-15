import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VendorNavbar } from "@/components/vendor/VendorNavbar";
import { VendorSidebar } from "@/components/vendor/VendorSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Eye, MessageSquare, Upload, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";

interface Dispute {
    id: string;
    order_id: string;
    reason: string;
    description: string;
    status: string;
    opened_at: string;
    resolved_at: string | null;
    resolution_notes: string | null;
    vendor_evidence_urls: string[] | null;
    vendor_response: string | null;
    vendor_response_at: string | null;
    order?: { total_ksh: number; created_at: string };
}

const VendorDisputes = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [responseOpen, setResponseOpen] = useState(false);
    const [response, setResponse] = useState("");
    const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState("open");

    useEffect(() => {
        if (!loading && !user) {
            navigate("/auth");
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        if (user) {
            loadDisputes();
        }
    }, [user]);

    const loadDisputes = async () => {
        setLoadingData(true);
        try {
            const { data, error } = await supabase
                .from("disputes")
                .select(`
          *,
          order:order_id (total_ksh, created_at)
        `)
                .eq("vendor_id", user?.id)
                .order("opened_at", { ascending: false });

            if (error) throw error;
            setDisputes((data as any[]) || []);
        } catch (error) {
            console.error("Error loading disputes:", error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleSubmitResponse = async () => {
        if (!selectedDispute || !response.trim()) {
            toast.error("Please enter a response");
            return;
        }

        setSubmitting(true);
        try {
            // Upload evidence files if any
            const uploadedUrls: string[] = [];
            if (evidenceFiles.length > 0) {
                for (const file of evidenceFiles) {
                    const fileName = `${Date.now()}-${file.name}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from("dispute-evidence")
                        .upload(`vendor/${selectedDispute.id}/${fileName}`, file);

                    if (uploadError) {
                        console.warn("Upload error:", uploadError);
                    } else if (uploadData) {
                        const { data: urlData } = supabase.storage
                            .from("dispute-evidence")
                            .getPublicUrl(uploadData.path);
                        uploadedUrls.push(urlData.publicUrl);
                    }
                }
            }

            // Update dispute with vendor response
            // Store in dedicated vendor_response column AND resolution_notes for visibility
            const existingNotes = selectedDispute.resolution_notes || "";
            const vendorResponseText = `[VENDOR RESPONSE - ${new Date().toLocaleDateString()}]\n${response}\n${uploadedUrls.length > 0 ? `\nEvidence: ${uploadedUrls.join(", ")}` : ""}`;

            const { error } = await supabase
                .from("disputes")
                .update({
                    vendor_response: response,
                    vendor_response_at: new Date().toISOString(),
                    vendor_evidence_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
                    resolution_notes: existingNotes
                        ? `${existingNotes}\n\n---\n\n${vendorResponseText}`
                        : vendorResponseText,
                    status: "under_review", // Move to under review when vendor responds
                })
                .eq("id", selectedDispute.id);

            if (error) throw error;

            toast.success("Response submitted! Admin will review your case.");
            setResponseOpen(false);
            setResponse("");
            setEvidenceFiles([]);
            setSelectedDispute(null);
            loadDisputes();
        } catch (error: any) {
            console.error("Submit error:", error);
            toast.error(error.message || "Failed to submit response");
        } finally {
            setSubmitting(false);
        }
    };

    const formatReason = (reason: string) => {
        const labels: Record<string, string> = {
            no_delivery: "Did not receive",
            wrong_item: "Wrong item",
            damaged: "Damaged",
            other: "Other",
        };
        return labels[reason] || reason;
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            open: "bg-red-500",
            under_review: "bg-yellow-500",
            resolved_refund: "bg-blue-500",
            resolved_release: "bg-green-500",
            closed: "bg-gray-500",
        };
        return colors[status] || "bg-gray-400";
    };

    const formatStatus = (status: string) => {
        return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const filteredDisputes = disputes.filter((d) => {
        if (activeTab === "open") return d.status === "open" || d.status === "under_review";
        return d.status.startsWith("resolved") || d.status === "closed";
    });

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="min-h-screen">
            <VendorNavbar />
            <div className="flex">
                <VendorSidebar />
                <main className="flex-1 p-8">
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Disputes</h1>
                            <p className="text-muted-foreground">
                                View and respond to customer complaints
                            </p>
                        </div>
                        <Button variant="outline" onClick={loadDisputes} disabled={loadingData}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loadingData ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>

                    {/* Alert Box */}
                    {disputes.filter((d) => d.status === "open").length > 0 && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-red-800">Action Required</h3>
                                    <p className="text-sm text-red-700 mt-1">
                                        You have {disputes.filter((d) => d.status === "open").length} open dispute(s).
                                        Please respond with your side of the story and any proof you have.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <Card className="border-red-500/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Needs Response</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">
                                    {disputes.filter((d) => d.status === "open").length}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-yellow-500/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Under Review</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-yellow-600">
                                    {disputes.filter((d) => d.status === "under_review").length}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {disputes.filter((d) => d.status.startsWith("resolved")).length}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{disputes.length}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="open">
                                Active ({disputes.filter((d) => d.status === "open" || d.status === "under_review").length})
                            </TabsTrigger>
                            <TabsTrigger value="resolved">Resolved/Closed</TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeTab}>
                            <Card>
                                <CardContent className="pt-6">
                                    {loadingData ? (
                                        <div className="text-center py-8">Loading disputes...</div>
                                    ) : filteredDisputes.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No {activeTab} disputes — keep up the great service! 🎉
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Order</TableHead>
                                                    <TableHead>Reason</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Opened</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredDisputes.map((dispute) => (
                                                    <TableRow key={dispute.id}>
                                                        <TableCell className="font-mono">
                                                            #{dispute.order_id.slice(0, 8)}
                                                            {dispute.order && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    KES {dispute.order.total_ksh?.toLocaleString()}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{formatReason(dispute.reason)}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={`${getStatusColor(dispute.status)} text-white border-0`}>
                                                                {formatStatus(dispute.status)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                            {new Date(dispute.opened_at).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setSelectedDispute(dispute);
                                                                        setDetailOpen(true);
                                                                    }}
                                                                >
                                                                    <Eye className="h-4 w-4 mr-1" />
                                                                    View
                                                                </Button>
                                                                {dispute.status === "open" && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setSelectedDispute(dispute);
                                                                            setResponseOpen(true);
                                                                        }}
                                                                    >
                                                                        <MessageSquare className="h-4 w-4 mr-1" />
                                                                        Respond
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {/* Detail Modal */}
                    <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                    Dispute Details
                                </DialogTitle>
                                <DialogDescription>
                                    Order #{selectedDispute?.order_id.slice(0, 8)}
                                </DialogDescription>
                            </DialogHeader>

                            {selectedDispute && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Badge className={`${getStatusColor(selectedDispute.status)} text-white border-0`}>
                                            {formatStatus(selectedDispute.status)}
                                        </Badge>
                                        <Badge variant="outline">{formatReason(selectedDispute.reason)}</Badge>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        Opened: {new Date(selectedDispute.opened_at).toLocaleDateString()}
                                    </div>

                                    {selectedDispute.order && (
                                        <div className="bg-muted p-3 rounded-lg">
                                            <p className="text-sm text-muted-foreground">Order Amount</p>
                                            <p className="text-lg font-bold">
                                                KES {selectedDispute.order.total_ksh?.toLocaleString()}
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <Label className="text-sm font-medium">Customer Complaint</Label>
                                        <p className="mt-1 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                                            {selectedDispute.description || "No description provided"}
                                        </p>
                                    </div>

                                    {selectedDispute.resolution_notes && (
                                        <div>
                                            <Label className="text-sm font-medium">Response/Resolution</Label>
                                            <p className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                                                {selectedDispute.resolution_notes}
                                            </p>
                                        </div>
                                    )}

                                    {selectedDispute.status === "open" && (
                                        <Button
                                            className="w-full"
                                            onClick={() => {
                                                setDetailOpen(false);
                                                setResponseOpen(true);
                                            }}
                                        >
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            Submit Your Response
                                        </Button>
                                    )}
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Response Modal */}
                    <Dialog open={responseOpen} onOpenChange={setResponseOpen}>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Respond to Dispute</DialogTitle>
                                <DialogDescription>
                                    Provide your side of the story and any evidence to support your case.
                                    The admin will review both sides before making a decision.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="response">Your Response *</Label>
                                    <Textarea
                                        id="response"
                                        placeholder="Explain what happened from your perspective..."
                                        value={response}
                                        onChange={(e) => setResponse(e.target.value)}
                                        rows={5}
                                        className="mt-2"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="evidence">Upload Evidence (Optional)</Label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Upload screenshots, shipping receipts, or other proof
                                    </p>
                                    <Input
                                        id="evidence"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                setEvidenceFiles(Array.from(e.target.files));
                                            }
                                        }}
                                    />
                                    {evidenceFiles.length > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {evidenceFiles.length} file(s) selected
                                        </p>
                                    )}
                                </div>

                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-800">
                                    <strong>Note:</strong> Your response will be sent to the admin for review.
                                    Be honest and provide as much detail as possible.
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setResponseOpen(false);
                                            setResponse("");
                                            setEvidenceFiles([]);
                                        }}
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={handleSubmitResponse}
                                        disabled={submitting || !response.trim()}
                                    >
                                        {submitting ? "Submitting..." : "Submit Response"}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </main>
            </div>
        </div>
    );
};

export default VendorDisputes;
