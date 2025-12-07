"use client";

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function ReportsPage() {
  const t = useTranslations('Reports');

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
      <p className="mb-6">{t('description')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/reports/view" className="p-6 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          <h2 className="text-xl font-semibold">{t('view_title')}</h2>
          <p>{t('view_desc')}</p>
        </Link>
        <Link href="/dashboard/reports/submit" className="p-6 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          <h2 className="text-xl font-semibold">{t('submit_title')}</h2>
          <p>{t('submit_desc')}</p>
        </Link>
      </div>
    </div>
  );
}
