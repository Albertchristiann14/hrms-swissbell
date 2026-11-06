<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'SIPU Management') }}</title>
        <meta name="description" content="SIPU Swiss-Belinn SKA Pekanbaru - Integrated hotel management system for operations, attendance, employee leaves, schedules, and task assignments.">
        <link rel="icon" type="image/jpeg" href="/logo/logoswissbell.jpg">
        <link rel="manifest" href="/manifest.json">
        <meta name="theme-color" content="#E31B23">
        <link rel="apple-touch-icon" href="/logo/logoswissbell.jpg">
        @if(request()->isSecure() || request()->header('X-Forwarded-Proto') === 'https')
        <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
        @endif

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
        <link rel="dns-prefetch" href="https://fonts.bunny.net">
        <link rel="preload" href="https://fonts.bunny.net/css?family=inter:400,500,600,700&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'">
        <noscript>
            <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700&display=swap" rel="stylesheet" />
        </noscript>

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
        
        <script>
            // Clean up and unregister any legacy service workers that cause fetch event rejections
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                        for (let registration of registrations) {
                            registration.unregister().then(function(boolean) {
                                console.log('Legacy ServiceWorker unregistered: ', boolean);
                            });
                        }
                    });
                    if (window.caches) {
                        caches.keys().then(function(names) {
                            for (let name of names) {
                                caches.delete(name);
                            }
                        });
                    }
                });
            }
        </script>
    </body>
</html>
