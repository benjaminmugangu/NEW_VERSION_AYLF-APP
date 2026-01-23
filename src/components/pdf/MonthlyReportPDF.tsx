'use client';

import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { PdfLayout } from './PdfLayout';
import { styles as commonStyles } from './styles';
import { ReportNarrative } from '@/services/monthlyStatsService';

// Custom styles for text-heavy report
const styles = StyleSheet.create({
    ...commonStyles,
    textParagraph: {
        fontSize: 11,
        lineHeight: 1.6,
        textAlign: 'justify',
        marginBottom: 10,
        fontFamily: 'Helvetica', // Standard serif-like font for PDFs
    },
    bulletPoint: {
        fontSize: 11,
        lineHeight: 1.6,
        marginLeft: 20,
        marginBottom: 5,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: 'bold',
        martinTop: 15,
        marginBottom: 8,
        color: '#000',
        textDecoration: 'underline',
    },
});

interface MonthlyReportPdfProps {
    narrative: ReportNarrative;
    period: string;
    stats?: any; // Optional for now, but good to have for data display
}

export const MonthlyReportPDF = ({ narrative, period, stats }: MonthlyReportPdfProps) => {
    return (
        <PdfLayout title={`RAPPORT DE PERFORMANCE MENSUEL – AYLF RDC`} generatedBy="Système Central">

            <Text style={{ fontSize: 13, textAlign: 'center', marginBottom: 15, fontWeight: 'bold', color: '#1e40af' }}>
                Période : {period}
            </Text>

            {/* SECTION 1: INDICATEURS DE PERFORMANCE (METRICS) */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>1. Indicateurs de Performance Clés (KPIs)</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                    <View style={{ flex: 1, alignItems: 'center', padding: 10, borderRightWidth: 1, borderRightColor: '#e2e8f0' }}>
                        <Text style={{ fontSize: 8, color: '#64748b' }}>Taux de Croissance</Text>
                        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>+{stats?.metrics?.growthRate || 0}%</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', padding: 10, borderRightWidth: 1, borderRightColor: '#e2e8f0' }}>
                        <Text style={{ fontSize: 8, color: '#64748b' }}>Taux de Rétention</Text>
                        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{stats?.metrics?.retentionRate || 0}%</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', padding: 10 }}>
                        <Text style={{ fontSize: 8, color: '#64748b' }}>Taux de Conversion</Text>
                        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{stats?.metrics?.conversionRate || 0}%</Text>
                    </View>
                </View>
            </View>

            {/* SECTION 2: BILAN FINANCIER */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>2. Bilan Financier de la Période</Text>
                <View style={styles.table}>
                    <View style={[styles.tableRow, { backgroundColor: '#f8fafc' }]}>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={styles.tableCellHeader}>Description</Text></View>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={styles.tableCellHeader}>Montant (FC/USD)</Text></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={styles.tableCell}>Total Revenus / Allocations</Text></View>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold', color: '#16a34a' }]}>{stats?.financials?.totalIncome.toLocaleString()} </Text></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={styles.tableCell}>Total Dépenses</Text></View>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold', color: '#dc2626' }]}>{stats?.financials?.totalExpenses.toLocaleString()} </Text></View>
                    </View>
                    <View style={[styles.tableRow, { backgroundColor: '#f1f5f9' }]}>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Solde Net</Text></View>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{stats?.financials?.balance.toLocaleString()} </Text></View>
                    </View>
                </View>
            </View>

            {/* SECTION 3: PERFORMANCE PAR SITE */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>3. Détails de Performance par Site</Text>
                <View style={styles.table}>
                    <View style={[styles.tableRow, { backgroundColor: '#f8fafc' }]}>
                        <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCellHeader}>Site</Text></View>
                        <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCellHeader}>Activités</Text></View>
                        <View style={[styles.tableCol, { width: '25%' }]}><Text style={styles.tableCellHeader}>Participants</Text></View>
                        <View style={[styles.tableCol, { width: '25%' }]}><Text style={styles.tableCellHeader}>Dépenses</Text></View>
                    </View>
                    {stats?.sitePerformance.map((site: any, i: number) => (
                        <View key={i} style={styles.tableRow}>
                            <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCell}>{site.name}</Text></View>
                            <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{site.activitiesCount}</Text></View>
                            <View style={[styles.tableCol, { width: '25%' }]}><Text style={styles.tableCell}>{site.participantsCount}</Text></View>
                            <View style={[styles.tableCol, { width: '25%' }]}><Text style={styles.tableCell}>{site.expenses.toLocaleString()}</Text></View>
                        </View>
                    ))}
                </View>
            </View>

            {/* SECTION 4: RÉSUMÉ NARRATIF */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>4. Synthèse des Activités</Text>
                {narrative.generalSummary.map((point, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: 10 }}>
                        <Text style={{ width: 10, fontSize: 10 }}>•</Text>
                        <Text style={{ flex: 1, fontSize: 10 }}>{point}</Text>
                    </View>
                ))}
            </View>

            {/* SECTION 5: CONCLUSION & PERSPECTIVES */}
            <View style={{ marginTop: 20, paddingHorizontal: 10 }}>
                <Text style={styles.sectionHeader}>5. Conclusion</Text>
                <Text style={[styles.textParagraph, { fontSize: 10 }]}>{narrative.conclusion}</Text>
            </View>

            {/* Signature Section */}
            <View style={{ marginTop: 30, alignItems: 'flex-end', paddingRight: 30 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold' }}>Le Bureau de Coordination National</Text>
                <Text style={{ fontSize: 9, marginTop: 30 }}>AYLF RDC - Généré le {new Date().toLocaleDateString('fr-FR')}</Text>
            </View>

        </PdfLayout>
    );
};
