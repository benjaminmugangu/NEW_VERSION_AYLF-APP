'use client';

import React, { useEffect, useState } from 'react';
import { PDFDownloadButton } from './PDFDownloadButton';

import { ReportNarrative } from '@/services/monthlyStatsService';

// Static import is safe here because this component (MonthlyReportDownloader) 
// is itself dynamically imported with ssr: false in the parent Page.
import { MonthlyReportPDF } from './MonthlyReportPDF';

interface MonthlyReportDownloaderProps {
    narrative: ReportNarrative;
    stats: any; // Using any for now to avoid circular dependency or type import issues, or import MonthlyStats
    period: string;
    fileName: string;
    label?: string;
}

export default function MonthlyReportDownloader({ narrative, stats, period, fileName, label }: MonthlyReportDownloaderProps) {
    return (
        <PDFDownloadButton
            document={
                <MonthlyReportPDF
                    narrative={narrative}
                    stats={stats}
                    period={period}
                />
            }
            fileName={fileName}
            label={label}
        />
    );
}
