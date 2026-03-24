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

        {/* Google AdSense — loads once globally, non-blocking */}
        <Script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5030474082686075"
            crossOrigin="anonymous"
            strategy="lazyOnload"
        />
        </body>
        </html>
    );
}