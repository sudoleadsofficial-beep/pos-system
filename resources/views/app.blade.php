<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Locale detection --}}
        <script>
            (function() {
                const savedLocale = localStorage.getItem('veg_locale') || localStorage.getItem('jkc_locale') || '{{ session("locale", "en") }}';
                document.documentElement.lang = savedLocale;
                document.documentElement.dir = savedLocale === 'ur' ? 'rtl' : 'ltr';
                document.documentElement.classList.remove('dark');
            })();
        </script>

        {{-- Inline style: Force light background --}}
        <style>
            html {
                background-color: #ffffff;
            }
        </style>

        <title inertia>{{ config('app.name', 'Vegetable POS') }}</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <link rel="alternate icon" type="image/x-icon" href="/favicon.ico">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

        <!-- Offline & Fallback Fonts -->
        <link rel="stylesheet" href="/fonts/fonts.css">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Naskh+Arabic:wght@400;600&family=Geist+Mono:wght@100..900&display=swap" rel="stylesheet">

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
