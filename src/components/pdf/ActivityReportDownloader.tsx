'use client';

import React, { useEffect, useState } from 'react';
import { PDFDownloadButton } from './PDFDownloadButton';


// Static import is safe here because this component is dynamically imported in the parent.
import { ActivityReportPDF } from './ActivityReportPDF';

// Duplicate the simplified interface or import from PDF if possible, 
// for now using any or re-defining minimum needed to avoid circular dep issues on types
// But importing types is fine.
// Let's rely on the PDF component's prop type inference if we can, or simplified props.

interface ActivityReportDownloaderProps {
    report: any; // Using any to avoid complex type mirroring here, the Template will validate
    fileName: string;
    label?: string;
}

export default function ActivityReportDownloader({ report, fileName, label }: ActivityReportDownloaderProps) {
    return (
        <PDFDownloadButton
            document={
                <ActivityReportPDF report={report} />
            }
            fileName={fileName}
            label={label}
        />
    );
}
