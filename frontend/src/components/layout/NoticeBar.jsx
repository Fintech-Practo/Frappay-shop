import React, { useMemo } from 'react';
import { useSiteSettings } from '@/context/SiteSettingsContext';

export default function NoticeBar() {
    const { header_notices } = useSiteSettings();

    const activeNotices = useMemo(() => {
        const list = Array.isArray(header_notices) ? header_notices : [];
        const filtered = list
            .filter(n => n?.is_active !== false)
            .map(n => ({
                id: n.id,
                message: n.message || n.text || '',
                link: n.link || null
            }))
            .filter(n => n.message.trim() !== '');

        if (filtered.length === 0) {
            return [{ id: 'default', message: 'Welcome to FrayPay!', link: null }];
        }
        return filtered;
    }, [header_notices]);

    // To prevent "showing 2 times" for a single notice, 
    // we use a massive 100vw gap so the clone is off-screen.
    const loopData = [...activeNotices, ...activeNotices];

    return (
        <div className="relative w-full h-full overflow-hidden flex items-center group">
            {/* Professional Esports Grade Edges - Very wide to blend into the links */}
            <div className="pointer-events-none absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-transparent via-primary/30 to-transparent z-20"></div>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-transparent via-primary/30 to-transparent z-20"></div>
            {/* Scrolling Track - Using 100vw for single notice gap */}
            <div className="w-full h-full overflow-hidden flex items-center">
                <div
                    className="flex whitespace-nowrap animate-ticker will-change-transform h-full items-center"
                    style={{
                        animationDuration: activeNotices.length === 1 ? '25s' : `${activeNotices.length * 15}s`
                    }}
                >
                    {loopData.map((notice, idx) => (
                        <div
                            key={`${notice.id || 'notice'}-${idx}`}
                            className={`flex items-center text-xs md:text-sm font-black tracking-[0.1em] py-1 uppercase
                                ${activeNotices.length === 1 ? 'min-w-full justify-center' : 'mx-32'}
                            `}
                        >
                            <span className="opacity-30 mr-8 text-accent/80">◆</span>

                            {notice.link ? (
                                <a
                                    href={notice.link}
                                    className="hover:text-accent transition-all duration-300 hover:scale-105"
                                >
                                    {notice.message}
                                </a>
                            ) : (
                                <span className="cursor-default">{notice.message}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes ticker {
                    0% { transform: translate3d(0, 0, 0); }
                    100% { transform: translate3d(-50%, 0, 0); }
                }

                .animate-ticker {
                    animation: ticker linear infinite;
                }

                .group:hover .animate-ticker {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
}