import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface PDFPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pdfBlob: Blob | null;
    title: string;
    fileName: string;
    onPrint?: () => void;
    onDownload?: () => void;
}

export const PDFPreviewDialog = ({
    open,
    onOpenChange,
    pdfBlob,
    title,
    fileName,
    onPrint,
    onDownload
}: PDFPreviewDialogProps) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const isMobile = useIsMobile();

    useEffect(() => {
        if (pdfBlob) {
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);

            return () => {
                URL.revokeObjectURL(url);
            };
        }
    }, [pdfBlob]);

    const handlePrint = () => {
        if (onPrint) {
            onPrint();
        } else if (pdfUrl) {
            // Fallback: open in new window and print
            const printWindow = window.open(pdfUrl, '_blank');
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                };
            }
        }
    };

    const handleDownload = () => {
        if (onDownload) {
            onDownload();
        } else if (pdfUrl) {
            // Fallback: trigger download
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = fileName;
            link.click();
        }
    };

    // Mobile full-page view
    if (isMobile) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="!fixed !inset-0 !z-50 !w-screen !h-screen !max-w-none !p-0 !m-0 !gap-0 !rounded-none !border-none !flex !flex-col !bg-background !translate-x-0 !translate-y-0 !left-0 !top-0 shadow-none outline-none ring-0">
                    {/* Mobile Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onOpenChange(false)}
                                className="h-8 w-8"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <h2 className="text-sm font-semibold truncate">{title}</h2>
                        </div>
                    </div>

                    {/* PDF Viewer */}
                    <div className="flex-1 overflow-hidden bg-muted/30">
                        {pdfUrl ? (
                            <iframe
                                src={pdfUrl}
                                className="w-full h-full border-0"
                                title="PDF Preview"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-muted-foreground">Loading preview...</p>
                            </div>
                        )}
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="flex gap-2 p-4 border-t bg-background sticky bottom-0">
                        <Button
                            onClick={handlePrint}
                            variant="outline"
                            className="flex-1 gap-2"
                        >
                            <Printer className="h-4 w-4" />
                            Print
                        </Button>
                        <Button
                            onClick={handleDownload}
                            className="flex-1 gap-2 bg-gradient-primary"
                        >
                            <Download className="h-4 w-4" />
                            Download
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Desktop dialog view
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!fixed !inset-0 !z-50 !w-screen !h-screen !max-w-none !p-0 !m-0 !gap-0 !rounded-none !border-none !flex !flex-col !bg-background !translate-x-0 !translate-y-0 !left-0 !top-0 shadow-none outline-none ring-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle>{title}</DialogTitle>
                        <div className="flex gap-2">
                            <Button
                                onClick={handlePrint}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                <Printer className="h-4 w-4" />
                                Print
                            </Button>
                            <Button
                                onClick={handleDownload}
                                size="sm"
                                className="gap-2 bg-gradient-primary"
                            >
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden bg-muted/30">
                    {pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full border-0"
                            title="PDF Preview"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">Loading preview...</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
