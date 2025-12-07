/**
 * Email Service (Mock Implementation)
 * 
 * In a real production environment, this would use Resend, SendGrid, or NodeMailer.
 * Currently, it logs emails to the console for demonstration purposes.
 */

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
    console.log('--- 📧 MOCK EMAIL SENDING 📧 ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('Content (Preview):', html.substring(0, 100) + '...');
    console.log('--------------------------------');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
}

export const emailTemplates = {
    reminder: (userName: string, activityTitle: string, days: number) => `
    <h1>Rappel d'Activité</h1>
    <p>Bonjour ${userName},</p>
    <p>Ceci est un rappel pour l'activité <strong>${activityTitle}</strong> qui aura lieu dans ${days} jours.</p>
    <p>Merci de vous préparer.</p>
  `,
    overdueReport: (userName: string, reportTitle: string) => `
    <h1>Rapport En Retard</h1>
    <p>Bonjour ${userName},</p>
    <p>Le rapport <strong>${reportTitle}</strong> est marqué comme "En Retard".</p>
    <p>Merci de le soumettre dès que possible.</p>
  `
};
