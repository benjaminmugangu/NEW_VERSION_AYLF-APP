import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Can be imported from a shared config
const locales = ['fr', 'en', 'sw'];

export default getRequestConfig(async ({ requestLocale }) => {
    // This typically corresponds to the `[locale]` segment
    let locale = await requestLocale;

    // Ensure that the incoming locale is valid
    if (!locale || !locales.includes(locale)) {
        locale = 'fr'; // Fallback
    }

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default
    };
});
