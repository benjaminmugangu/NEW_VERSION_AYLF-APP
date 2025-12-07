'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nextLocale = e.target.value;
        startTransition(() => {
            // Replace the locale in the pathname
            // Note: In a real app, use next-intl's Link or pathnames navigation
            // Simple hack for now: window.location compatible reload or regex replace
            const currentPath = window.location.pathname;
            const newPath = currentPath.replace(`/${locale}`, `/${nextLocale}`);

            // If path didn't have locale (default 'fr' hidden?), force it
            // Standard middleware forces locale prefix, so replace should work unless default hidden
            router.push(newPath);
        });
    };

    return (
        <div className="relative inline-block text-left">
            <select
                defaultValue={locale}
                onChange={onSelectChange}
                disabled={isPending}
                className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm sm:leading-6"
            >
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
                <option value="sw">🇹🇿 Kiswahili</option>
            </select>
        </div>
    );
}
