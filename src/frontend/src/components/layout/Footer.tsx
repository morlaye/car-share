import React from 'react';

export function Footer() {
    return (
        <footer className="bg-primary text-slate-300 py-12 border-t border-indigo-900/50 mt-auto">
            <div className="container mx-auto px-4 text-center text-sm">
                <p className="font-medium text-white mb-2">G-MoP</p>
                <p>&copy; {new Date().getFullYear()} Guinea Mobility Platform. Conçu à Conakry.</p>
            </div>
        </footer>
    );
}
