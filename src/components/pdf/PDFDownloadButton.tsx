'use client';

import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

// Dynamically import PDFDownloadLink
// Note: We use a specific pattern to handle ESM module resolution in Next.js
const PDFDownloadLink = dynamic(
    () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
    {
        ssr: false,
        loading: () => <Button disabled variant="outline"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading PDF...</Button>,
    }
);

interface PDFDownloadButtonProps {
    document: React.ReactElement;
    fileName: string;
    label?: string;
}

export const PDFDownloadButton = ({ document, fileName, label = "Télécharger PDF" }: PDFDownloadButtonProps) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient || !document) {
        return <Button disabled variant="outline"><FileText className="mr-2 h-4 w-4" /> {label}</Button>;
    }

    return (
        <PDFDownloadLink document={document} fileName={fileName}>
            {/* @ts-ignore */}
            {({ blob, url, loading, error }: any) => (
                <Button variant="outline" disabled={loading}>
                    {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <FileText className="mr-2 h-4 w-4" />
                    )}
                    {loading ? 'Génération...' : label}
                </Button>
            )}
        </PDFDownloadLink>
    );
};
