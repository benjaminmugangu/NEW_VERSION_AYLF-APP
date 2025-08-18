import Link from 'next/link';

export default function ReportsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Rapports</h1>
      <p className="mb-6">Veuillez choisir une action :</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/reports/view" className="p-6 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          <h2 className="text-xl font-semibold">Voir les rapports</h2>
          <p>Consulter les rapports existants.</p>
        </Link>
        <Link href="/dashboard/reports/submit" className="p-6 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          <h2 className="text-xl font-semibold">Soumettre un rapport</h2>
          <p>Créer et soumettre un nouveau rapport.</p>
        </Link>
      </div>
    </div>
  );
}
