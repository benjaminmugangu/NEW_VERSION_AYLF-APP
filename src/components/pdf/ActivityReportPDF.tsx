'use client';

import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { PdfLayout } from './PdfLayout';
import { styles } from './styles';

// Define types based on Report model (simplified)
interface ActivityReportData {
    id: string;
    title: string;
    activityDate: Date | string;
    submissionDate: Date | string;
    thematic: string;
    content: string;
    girlsCount?: number | null;
    boysCount?: number | null;
    participantsCountReported?: number | null;
    speaker?: string | null;
    moderator?: string | null;
    financialSummary?: string | null;
    totalExpenses?: number | null;
    currency?: string | null;
    submittedBy: {
        name: string;
        email: string;
    };
    site?: {
        name: string;
    } | null;
    smallGroup?: {
        name: string;
    } | null;
}

interface ActivityReportPdfProps {
    report: ActivityReportData;
}

export const ActivityReportPDF = ({ report }: ActivityReportPdfProps) => {
    const formattedDate = new Date(report.activityDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <PdfLayout title="RAPPORT D'ACTIVITÉ" generatedBy={report.submittedBy.name}>

            {/* General Info Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>1. Informations Générales</Text>

                <View style={styles.row}>
                    <Text style={styles.label}>Titre de l'activité:</Text>
                    <Text style={styles.value}>{report.title}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Date:</Text>
                    <Text style={styles.value}>{formattedDate}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Thématique:</Text>
                    <Text style={styles.value}>{report.thematic}</Text>
                </View>

                {report.site && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Site:</Text>
                        <Text style={styles.value}>{report.site.name}</Text>
                    </View>
                )}

                {report.smallGroup && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Petit Groupe:</Text>
                        <Text style={styles.value}>{report.smallGroup.name}</Text>
                    </View>
                )}

                {report.speaker && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Orateur:</Text>
                        <Text style={styles.value}>{report.speaker}</Text>
                    </View>
                )}

                {report.moderator && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Modérateur:</Text>
                        <Text style={styles.value}>{report.moderator}</Text>
                    </View>
                )}
            </View>

            {/* Statistics Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>2. Statistiques de Participation</Text>

                <View style={styles.table}>
                    <View style={styles.tableRow}>
                        <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Participants Total</Text></View>
                        <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Hommes</Text></View>
                        <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Femmes</Text></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCell}>{report.participantsCountReported || 0}</Text>
                        </View>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCell}>{report.boysCount || 0}</Text>
                        </View>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCell}>{report.girlsCount || 0}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Content Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>3. Déroulement et Contenu</Text>
                <Text style={{ fontSize: 10, textAlign: 'justify' }}>{report.content}</Text>
            </View>

            {/* Financial Section */}
            {(report.financialSummary || report.totalExpenses) && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Résumé Financier</Text>

                    {report.totalExpenses && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Dépenses Totales:</Text>
                            <Text style={styles.value}>{report.totalExpenses} {report.currency || 'USD'}</Text>
                        </View>
                    )}

                    {report.financialSummary && (
                        <View style={{ marginTop: 5 }}>
                            <Text style={styles.label}>Détails:</Text>
                            <Text style={{ fontSize: 10, marginTop: 2 }}>{report.financialSummary}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Signatures */}
            <View style={styles.signatureSection}>
                <View style={styles.signatureBox}>
                    <View style={styles.signatureLine} />
                    <Text style={styles.signatureLabel}>Soumis par: {report.submittedBy.name}</Text>
                    <Text style={{ fontSize: 8 }}>Date: {new Date(report.submissionDate).toLocaleDateString()}</Text>
                </View>

                <View style={styles.signatureBox}>
                    <View style={styles.signatureLine} />
                    <Text style={styles.signatureLabel}>Validé par: _________________</Text>
                    <Text style={{ fontSize: 8 }}>Scope: Coordination / Finance</Text>
                </View>
            </View>
        </PdfLayout>
    );
};
