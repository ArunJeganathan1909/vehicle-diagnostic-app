import { AuthProvider } from '@/context/AuthContext';
import '@/styles/markdown.css';
import '@/app/globals.css'

export const metadata = {
    title: "AutoDiag",
    description: "Vehicle Diagnostic Chat Bot",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <body>
        <AuthProvider>
            {children}
        </AuthProvider>
        </body>
        </html>
    );
}