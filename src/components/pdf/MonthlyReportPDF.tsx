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
        <PdfLayout title={`RAPPORT MENSUEL – AYLF RDC`} generatedBy="Système Central">

            <Text style={{ fontSize: 13, textAlign: 'center', marginBottom: 10, fontWeight: 'bold' }}>
                Période couverte : {period}
            </Text>

            {/* Stats Summary Box (New) */}
            {stats && (
                <View style={{ marginVertical: 10, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>CHIFFRES CLÉS :</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 10 }}>Activités: {stats.totalActivities}</Text>
                        <Text style={{ fontSize: 10 }}>Participants: {stats.participation?.total || 0}</Text>
                        <Text style={{ fontSize: 10 }}>Sites Actifs: {stats.activeSites?.length || 0}</Text>
                    </View>
                </View>
            )}

            {/* 1. Introduction */}
            <View style={styles.section}>
                {narrative.intro.split('\n\n').map((para, i) => (
                    <Text key={i} style={styles.textParagraph}>{para}</Text>
                ))}
            </View>

            {/* 2. Bilan Général */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>1. Bilan Général des Activités</Text>
                {narrative.generalSummary.map((point, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: 5 }}>
                        <Text style={{ width: 15, fontSize: 15 }}>•</Text>
                        <Text style={{ flex: 1, fontSize: 11, lineHeight: 1.5 }}>{point}</Text>
                    </View>
                ))}
            </View>

            {/* 3. Participation */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>2. Participation et Sites d'Opération</Text>
                <Text style={styles.textParagraph}>{narrative.participation}</Text>
            </View>

            {/* 4. Sites Actifs */}
            <View style={styles.section}>
                <Text style={{ fontSize: 11, marginBottom: 5, fontStyle: 'italic' }}>
                    Les initiatives ont été organisées dans les sites suivants :
                </Text>
                <Text style={styles.textParagraph}>{narrative.activeSites}</Text>
            </View>

            {/* 5. Conclusion */}
            <View style={{ marginTop: 20 }}>
                {narrative.conclusion.split('\n\n').map((para, i) => (
                    <Text key={i} style={styles.textParagraph}>{para}</Text>
                ))}
            </View>

            {/* Signature Section */}
            <View style={{ marginTop: 40, alignItems: 'flex-end', paddingRight: 30 }}>
                <Text style={{ fontSize: 11, fontWeight: 'bold' }}>Le Bureau de Coordination National</Text>
                <Text style={{ fontSize: 10, marginTop: 40 }}>AYLF RDC</Text>
            </View>

        </PdfLayout>
    );
};
