import { AuthProvider } from '@/context/AuthContext';
import '@/styles/markdown.css';
import '@/app/globals.css';
import Script from 'next/script';

export const metadata = {
    title: "AutoDiag",
    description: "Vehicle Diagnostic Chat Bot",
    other: {
        'google-adsense-account': 'ca-pub-5030474082686075',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <body>
        <AuthProvider>
            {children}
        </AuthProvider>

        {/* Google Analytics GA4 */}
        <Script
            async
            src="https://www.googletagmanager.com/gtag/js?id=G-W27N304CF0"
            strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
            {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-W27N304CF0');
            `}
        </Script>

        {/*<script async src="https://www.googletagmanager.com/gtag/js?id=G-W27N304CF0"></script>*/}
        {/*<script>*/}
        {/*    window.dataLayer = window.dataLayer || [];*/}
        {/*    function gtag(){dataLayer.push(arguments);}*/}
        {/*    gtag('js', new Date());*/}

        {/*    gtag('config', 'G-W27N304CF0');*/}
        {/*</script>*/}

        {/* Google AdSense — loads once globally, non-blocking */}
        <Script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5030474082686075"
            crossOrigin="anonymous"
            strategy="afterInteractive"
        />
        </body>
        </html>
    );
}