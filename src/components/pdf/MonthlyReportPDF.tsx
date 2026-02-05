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
        marginTop: 15,
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
                    <View style={{ flex: 1, alignItems: 'center', padding: 10, borderRightWidth: 1, borderRightColor: '#e2e8f0' }}>
                        <Text style={{ fontSize: 8, color: '#64748b' }}>Taux de Conversion</Text>
                        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{stats?.metrics?.conversionRate || 0}%</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', padding: 10 }}>
                        <Text style={{ fontSize: 8, color: '#64748b' }}>Taux de Reporting</Text>
                        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{stats?.metrics?.reportingRate || 0}%</Text>
                        {stats?.trends?.activityDelta !== undefined && (
                            <Text style={{ fontSize: 7, color: stats.trends.activityDelta >= 0 ? '#16a34a' : '#dc2626' }}>
                                {stats.trends.activityDelta >= 0 ? '↑' : '↓'} {Math.abs(stats.trends.activityDelta)}% vs M-1
                            </Text>
                        )}
                    </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 5 }}>
                    <Text style={{ fontSize: 8, color: '#64748b' }}>Score de Qualité (Preuves) : </Text>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: (stats?.metrics?.qualityScore || 0) < 70 ? '#dc2626' : '#16a34a' }}>
                        {stats?.metrics?.qualityScore || 0}%
                    </Text>
                </View>
            </View>

            {/* SECTION 2: BILAN FINANCIER & FLUX HIÉRARCHIQUES */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>2. Bilan Financier & Flux Hiérarchiques</Text>
                <View style={styles.table}>
                    <View style={[styles.tableRow, { backgroundColor: '#f8fafc' }]}>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={styles.tableCellHeader}>Flux de Trésorerie NC → SC → SGL</Text></View>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={styles.tableCellHeader}>Montant (USD)</Text></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={styles.tableCell}>Allocations Nationales Reçues (NC → SC)</Text></View>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{stats?.hierarchy?.nationalToSite?.toLocaleString()} USD</Text></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={styles.tableCell}>Allocations Sites vers Groupes (SC → SGL)</Text></View>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{stats?.hierarchy?.siteToGroup?.toLocaleString()} USD</Text></View>
                    </View>
                    <View style={[styles.tableRow, { marginTop: 5, borderTopWidth: 1 }]}>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={styles.tableCell}>Dépenses Déclarées (Rapports)</Text></View>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold', color: '#dc2626' }]}>{stats?.financials?.reportedExpenses?.toLocaleString()} USD</Text></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={styles.tableCell}>Dépenses Comptabilisées (Transactions)</Text></View>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold', color: '#dc2626' }]}>{stats?.financials?.accountedExpenses?.toLocaleString()} USD</Text></View>
                    </View>
                    <View style={[styles.tableRow, { backgroundColor: '#f1f5f9' }]}>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Solde Net de Période</Text></View>
                        <View style={[styles.tableCol, { width: '50%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{stats?.financials?.balance?.toLocaleString()} USD</Text></View>
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

            {/* SECTION 4: QUALITÉ DU REPORTING & ORGANISATION */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>4. Qualité du Reporting & Organisation</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                        <Text style={{ fontSize: 8, color: '#64748b' }}>Statistiques Membres</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{stats?.organizational?.totalMembers} membres (+{stats?.organizational?.newMembers})</Text>
                        {stats?.trends?.participationDelta !== undefined && (
                            <Text style={{ fontSize: 7, color: stats.trends.participationDelta >= 0 ? '#16a34a' : '#dc2626' }}>
                                Tendance : {stats.trends.participationDelta >= 0 ? '+' : ''}{stats.trends.participationDelta}%
                            </Text>
                        )}
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                        <Text style={{ fontSize: 8, color: '#64748b' }}>Réalisation Objectifs</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>Taux de Réalisation : {stats?.metrics?.realizationRate}%</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                        <Text style={{ fontSize: 8, color: '#64748b' }}>Délai Moyen de Soumission</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{stats?.metrics?.avgSubmissionDelay} jours</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                        <Text style={{ fontSize: 8, color: '#64748b' }}>Délai Moyen d&apos;Approbation</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{stats?.metrics?.avgReviewDelay} jours</Text>
                    </View>
                </View>
            </View>

            {/* SECTION 5: PHOTOGRAPHIE MICROSCOPIQUE DES ACTIVITÉS */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>5. Photographie Microscopique des Activités</Text>
                <View style={styles.table}>
                    <View style={[styles.tableRow, { backgroundColor: '#f8fafc' }]}>
                        <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>Date</Text></View>
                        <View style={[styles.tableCol, { width: '35%' }]}><Text style={styles.tableCellHeader}>Activité</Text></View>
                        <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>Site</Text></View>
                        <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>Part. (R/P)</Text></View>
                        <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCellHeader}>Dépenses</Text></View>
                    </View>
                    {stats?.detailedActivities?.map((act: any, i: number) => (
                        <View key={i} style={styles.tableRow}>
                            <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{new Date(act.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</Text></View>
                            <View style={[styles.tableCol, { width: '35%' }]}><Text style={styles.tableCell}>{act.title}</Text></View>
                            <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{act.siteName}</Text></View>
                            <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{act.participantsReal}/{act.participantsPlanned}</Text></View>
                            <View style={[styles.tableCol, { width: '20%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{act.expenseDeclared.toLocaleString()} USD</Text></View>
                        </View>
                    ))}
                </View>
            </View>

            {/* SECTION 6: MOUVEMENTS D'INVENTAIRE (Audit Royal) */}
            {stats?.inventory && (stats.inventory.movementsIn > 0 || stats.inventory.movementsOut > 0) && (
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>6. Gestion Patrimoniale (Inventaire)</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, { backgroundColor: '#f8fafc' }]}>
                            <View style={[styles.tableCol, { width: '40%' }]}><Text style={styles.tableCellHeader}>Article</Text></View>
                            <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCellHeader}>Direction</Text></View>
                            <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCellHeader}>Quantité</Text></View>
                        </View>
                        {stats.inventory.topMovedItems.map((item: any, i: number) => (
                            <View key={i} style={styles.tableRow}>
                                <View style={[styles.tableCol, { width: '40%' }]}><Text style={styles.tableCell}>{item.name}</Text></View>
                                <View style={[styles.tableCol, { width: '30%' }]}>
                                    <Text style={[styles.tableCell, { color: item.direction === 'in' ? '#16a34a' : '#dc2626' }]}>
                                        {item.direction === 'in' ? 'Entrée' : 'Sortie'}
                                    </Text>
                                </View>
                                <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCell}>{item.quantity}</Text></View>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* SECTION 7: RÉSUMÉ NARRATIF */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>{stats?.inventory ? '7' : '6'}. Synthèse Stratégique</Text>
                {narrative.generalSummary.map((point, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: 10 }}>
                        <Text style={{ width: 10, fontSize: 10 }}>•</Text>
                        <Text style={{ flex: 1, fontSize: 10 }}>{point}</Text>
                    </View>
                ))}
            </View>

            {/* SECTION CONCLUSION */}
            <View style={{ marginTop: 20, paddingHorizontal: 10 }}>
                <Text style={styles.sectionHeader}>{stats?.inventory ? '8' : '7'}. Conclusion & Recommandations</Text>
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
