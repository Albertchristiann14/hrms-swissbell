import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';

import ErrorBoundary from './Components/ErrorBoundary';
import { PersistentAuthenticatedLayout } from './Layouts/AuthenticatedLayout';

const appName = import.meta.env.VITE_APP_NAME || 'Swiss-Belinn SKA';
const persistentLayout = (page: ReactNode) => <PersistentAuthenticatedLayout>{page}</PersistentAuthenticatedLayout>;

// Login, error and printable documents intentionally use standalone layouts.
const usesAuthenticatedShell = (name: string) =>
    name !== 'Welcome' &&
    name !== 'Error' &&
    !name.startsWith('Auth/') &&
    !name.endsWith('/Print');

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: async (name) => {
        const mod: any = await resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        );
        const page = mod?.default ?? mod;
        if (typeof page !== 'function') {
            throw new Error(`Unable to resolve Inertia page: ${name}`);
        }

        if (usesAuthenticatedShell(name) && !page.layout) {
            page.layout = persistentLayout;
        }

        return mod;
    },
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ErrorBoundary>
                <App {...props} />
            </ErrorBoundary>
        );
    },
    progress: {
        color: '#6366f1',
        showSpinner: true,
        delay: 50,
    },
});
