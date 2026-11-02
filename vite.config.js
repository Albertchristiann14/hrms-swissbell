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
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('recharts') || id.includes('react-is')) {
                            return 'vendor-charts';
                        }
                        if (id.includes('react/') || id.includes('react-dom/')) {
                            return 'vendor-react';
                        }
                        if (id.includes('@inertiajs')) {
                            return 'vendor-inertia';
                        }
                        if (id.includes('@headlessui')) {
                            return 'vendor-ui';
                        }
                    }
                },
            },
        },
        chunkSizeWarningLimit: 1000,
    },
});

