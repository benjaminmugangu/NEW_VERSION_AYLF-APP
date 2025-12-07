import React from 'react';
import { useTranslations } from 'next-intl';
import { NotificationCenter } from './components/NotificationCenter';

export default function NotificationsPage() {
    return (
        <div className="container mx-auto py-6 max-w-4xl">
            <NotificationCenter />
        </div>
    );
}
