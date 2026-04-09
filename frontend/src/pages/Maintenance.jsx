import { Settings } from 'lucide-react';
import React from 'react';
import { useSiteSettings } from '@/context/SiteSettingsContext';

export default function Maintenance() {
    const { maintenance_mode } = useSiteSettings();
    const message = maintenance_mode?.message || "We are currently performing scheduled maintenance to improve our platform. We'll be back online shortly.";
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-card p-8 rounded-2xl shadow-xl border border-border text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <Settings className="w-12 h-12 text-primary animate-spin-slow" style={{ animationDuration: '3s' }} />
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Under Maintenance
                </h1>

                <p className="text-muted-foreground text-lg leading-relaxed">
                    {message}
                </p>

                <div className="pt-6 border-t border-border mt-8">
                    <p className="text-sm text-muted-foreground">
                        Thank you for your patience! 🛠️
                    </p>
                </div>
            </div>
        </div>
    );
}
