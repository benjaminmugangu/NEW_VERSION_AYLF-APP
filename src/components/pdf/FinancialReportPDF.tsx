import { Text, View } from '@react-pdf/renderer';
import { PdfLayout } from './PdfLayout';
import { styles } from './styles';

interface Transaction {
    id: string;
    date: Date | string;
    description: string;
    amount: number;
    category: string;
    type: 'income' | 'expense';
}

interface FinancialReportData {
    period: string; // e.g. "Janvier 2024" or "Q1 2024"
    startDate: Date | string;
    endDate: Date | string;
    generatedBy: {
        name: string;
        role: string;
    };
    siteName?: string;
    currency: string;
    income: Transaction[];
    expenses: Transaction[];
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
}

interface FinancialReportPdfProps {
    data: FinancialReportData;
}

export const FinancialReportPDF = ({ data }: FinancialReportPdfProps) => {
    const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('fr-FR');
    const formatMoney = (amount: number) =>
        new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(amount);

    return (
        <PdfLayout
            title={`RAPPORT FINANCIER - ${data.period}`}
            generatedBy={data.generatedBy.name}
        >

            {/* Context Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>1. Contexte</Text>

                {data.siteName && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Entité:</Text>
                        <Text style={styles.value}>{data.siteName}</Text>
                    </View>
                )}

                <View style={styles.row}>
                    <Text style={styles.label}>Période:</Text>
                    <Text style={styles.value}>Du {formatDate(data.startDate)} au {formatDate(data.endDate)}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Devise:</Text>
                    <Text style={styles.value}>{data.currency}</Text>
                </View>
            </View>

            {/* Summary Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>2. Synthèse</Text>

                <View style={styles.table}>
                    <View style={styles.tableRow}>
                        <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Total Entrées</Text></View>
                        <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Total Sorties</Text></View>
                        <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Solde Net</Text></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={styles.tableCol}>
                            <Text style={{ ...styles.tableCell, color: '#16a34a' }}>+ {formatMoney(data.totalIncome)}</Text>
                        </View>
                        <View style={styles.tableCol}>
                            <Text style={{ ...styles.tableCell, color: '#dc2626' }}>- {formatMoney(data.totalExpenses)}</Text>
                        </View>
                        <View style={styles.tableCol}>
                            <Text style={{ ...styles.tableCell, fontWeight: 'bold' }}>{formatMoney(data.netBalance)}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Income Details */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>3. Détail des Entrées</Text>
                {data.income.length > 0 ? (
                    <View style={styles.table}>
                        <View style={styles.tableRow}>
                            <View style={{ ...styles.tableColHeader, width: '20%' }}><Text style={styles.tableCellHeader}>Date</Text></View>
                            <View style={{ ...styles.tableColHeader, width: '50%' }}><Text style={styles.tableCellHeader}>Description</Text></View>
                            <View style={{ ...styles.tableColHeader, width: '30%' }}><Text style={styles.tableCellHeader}>Montant</Text></View>
                        </View>
                        {data.income.map((tx) => (
                            <View style={styles.tableRow} key={tx.id}>
                                <View style={{ ...styles.tableCol, width: '20%' }}><Text style={styles.tableCell}>{formatDate(tx.date)}</Text></View>
                                <View style={{ ...styles.tableCol, width: '50%' }}><Text style={styles.tableCell}>{tx.description}</Text></View>
                                <View style={{ ...styles.tableCol, width: '30%' }}><Text style={styles.tableCell}>{formatMoney(tx.amount)}</Text></View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={{ fontSize: 10, fontStyle: 'italic', padding: 10 }}>Aucune entrée enregistrée sur cette période.</Text>
                )}
            </View>

            {/* Expense Details */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>4. Détail des Dépenses</Text>
                {data.expenses.length > 0 ? (
                    <View style={styles.table}>
                        <View style={styles.tableRow}>
                            <View style={{ ...styles.tableColHeader, width: '20%' }}><Text style={styles.tableCellHeader}>Date</Text></View>
                            <View style={{ ...styles.tableColHeader, width: '50%' }}><Text style={styles.tableCellHeader}>Description</Text></View>
                            <View style={{ ...styles.tableColHeader, width: '30%' }}><Text style={styles.tableCellHeader}>Montant</Text></View>
                        </View>
                        {data.expenses.map((tx) => (
                            <View style={styles.tableRow} key={tx.id}>
                                <View style={{ ...styles.tableCol, width: '20%' }}><Text style={styles.tableCell}>{formatDate(tx.date)}</Text></View>
                                <View style={{ ...styles.tableCol, width: '50%' }}><Text style={styles.tableCell}>{tx.description}</Text></View>
                                <View style={{ ...styles.tableCol, width: '30%' }}><Text style={styles.tableCell}>{formatMoney(tx.amount)}</Text></View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={{ fontSize: 10, fontStyle: 'italic', padding: 10 }}>Aucune dépense enregistrée sur cette période.</Text>
                )}
            </View>

            {/* Signatures */}
            <View style={styles.signatureSection}>
                <View style={styles.signatureBox}>
                    <View style={styles.signatureLine} />
                    <Text style={styles.signatureLabel}>Préparé par: {data.generatedBy.name}</Text>
                    <Text style={{ fontSize: 8 }}>{data.generatedBy.role}</Text>
                </View>

                <View style={styles.signatureBox}>
                    <View style={styles.signatureLine} />
                    <Text style={styles.signatureLabel}>Approuvé par: _________________</Text>
                    <Text style={{ fontSize: 8 }}>Coordination Nationale / Finance</Text>
                </View>
            </View>
        </PdfLayout>
    );
};
