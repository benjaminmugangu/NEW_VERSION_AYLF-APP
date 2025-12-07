'use client';

import React, { useEffect, useState } from 'react';
import { PDFDownloadButton } from './PDFDownloadButton';

import { ReportNarrative } from '@/services/monthlyStatsService';

// Static import is safe here because this component (MonthlyReportDownloader) 
// is itself dynamically imported with ssr: false in the parent Page.
import { MonthlyReportPDF } from './MonthlyReportPDF';

interface MonthlyReportDownloaderProps {
    narrative: ReportNarrative;
    period: string;
    fileName: string;
    label?: string;
}

export default function MonthlyReportDownloader({ narrative, period, fileName, label }: MonthlyReportDownloaderProps) {
    return (
        <PDFDownloadButton
            document={
                <MonthlyReportPDF
                    narrative={narrative}
                    period={period}
                />
            }
            fileName={fileName}
            label={label}
        />
    );
}
