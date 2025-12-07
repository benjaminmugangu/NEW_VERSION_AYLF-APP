import { Page, Text, View, Image, Document } from '@react-pdf/renderer';
import { styles } from './styles';

interface PdfLayoutProps {
  children: React.ReactNode;
  title: string;
  generatedBy?: string;
  logoUrl?: string; // Optional path to logo
}

export const PdfLayout = ({ children, title, generatedBy = 'AYLF Group Tracker', logoUrl }: PdfLayoutProps) => {
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Logo */}
            {/* The image path must be relative to the public folder or an absolute URL (if CORS allowed) */}
            {/* For client-side generation, window.location.origin + '/logo.png' is safest if local */}
            <Image src="/logo.png" style={styles.logo} />
            <Text style={styles.organizationName}>AYLF</Text>
            <Text style={styles.organizationSubtitle}>African Youth Leadership Forum</Text>
            <Text style={styles.organizationSubtitle}>Group Tracking System</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 10, color: '#64748b' }}>Date: {currentDate}</Text>
            {generatedBy && <Text style={{ fontSize: 10, color: '#64748b' }}>Généré par: {generatedBy}</Text>}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Content */}
        {children}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Document Officiel - Usage Interne Uniquement</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
