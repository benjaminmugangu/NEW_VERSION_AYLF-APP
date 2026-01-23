import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Helvetica' },
    header: { fontSize: 24, textAlign: 'center', marginBottom: 20, fontWeight: 'bold' },
    title: { fontSize: 18, textAlign: 'center', marginBottom: 30, textTransform: 'uppercase' },
    body: { fontSize: 12, marginBottom: 10, lineHeight: 1.5 },
    signature: { marginTop: 60, textAlign: 'right', marginRight: 40 },
    signatureLine: { borderTopWidth: 1, width: 200, alignSelf: 'flex-end', marginTop: 10 },
    bold: { fontWeight: 'bold' }
});

export interface CertificateData {
    coordinatorName: string;
    role: string;
    entity: string;
    startDate: string;
    endDate: string;
    duration: string;
    nationalCoordinatorName: string;
}

export function CertificateTemplate({ data }: { readonly data: CertificateData }) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text>AYLF GROUP TRACKER</Text>
                </View>

                <View style={styles.title}>
                    <Text>CERTIFICAT DE SERVICE</Text>
                </View>

                <View style={styles.body}>
                    <Text>Ce certificat est décerné à :</Text>
                    <Text style={{ fontSize: 16, marginVertical: 10, textAlign: 'center' }}>{data.coordinatorName}</Text>

                    <Text>Pour avoir servi avec dévouement en tant que :</Text>
                    <Text style={{ fontSize: 14, marginVertical: 5, fontWeight: 'bold' }}>{data.role}</Text>

                    <Text>Au sein de l&apos;entité :</Text>
                    <Text style={{ fontSize: 14, marginVertical: 5 }}>{data.entity}</Text>

                    <Text style={{ marginTop: 20 }}>Période de service :</Text>
                    <Text>Du {data.startDate} au {data.endDate}</Text>
                    <Text>Durée totale : {data.duration}</Text>
                </View>

                <View style={styles.signature}>
                    <Text>Coordinateur National</Text>
                    <View style={styles.signatureLine} />
                    <Text style={{ marginTop: 5 }}>{data.nationalCoordinatorName}</Text>
                </View>
            </Page>
        </Document>
    );
}
