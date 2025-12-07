import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 11,
        lineHeight: 1.5,
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#2563eb', // Primary blue
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'column',
    },
    headerRight: {
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    logo: {
        width: 60,
        height: 60,
        marginBottom: 5,
    },
    organizationName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2563eb',
        textTransform: 'uppercase',
    },
    organizationSubtitle: {
        fontSize: 8,
        color: '#64748b',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 10,
        textDecoration: 'underline',
    },
    subtitle: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 20,
        color: '#475569',
    },
    section: {
        marginVertical: 10,
        padding: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        backgroundColor: '#f1f5f9',
        padding: 4,
        color: '#1e293b',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    label: {
        width: 120,
        fontWeight: 'bold',
        fontSize: 10,
        color: '#475569',
    },
    value: {
        flex: 1,
        fontSize: 10,
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        marginVertical: 10,
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row',
    },
    tableColHeader: {
        width: '25%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        backgroundColor: '#eff6ff',
        padding: 5,
    },
    tableCol: {
        width: '25%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        padding: 5,
    },
    tableCellHeader: {
        margin: 'auto',
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1e40af',
    },
    tableCell: {
        margin: 'auto',
        fontSize: 10,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 8,
        color: '#94a3b8',
    },
    signatureSection: {
        marginTop: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    signatureBox: {
        flexDirection: 'column',
        alignItems: 'center',
        width: 150,
    },
    signatureLine: {
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        marginBottom: 5,
        height: 40,
    },
    signatureLabel: {
        fontSize: 10,
        fontWeight: 'bold',
    }
});
