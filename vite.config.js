import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
    ],
    server: {
        watch: {
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 50,
            },
        },
    },
    build: {
        chunkSizeWarningLimit: 1000,
    },
});

