import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

import ErrorBoundary from './Components/ErrorBoundary';

const appName = import.meta.env.VITE_APP_NAME || 'Swiss-Belinn SKA';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: async (name) => {
        const mod: any = await resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        );
        if (mod && (typeof mod === 'function' || typeof mod.default === 'function')) {
            return mod;
        }
        return import(/* @vite-ignore */ `./Pages/${name}.tsx?t=${Date.now()}`);
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
