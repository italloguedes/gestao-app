import React from 'react';
import Link from 'next/link';

interface QuickActionProps {
    href: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    color: string;
}

export default function QuickAction({ href, icon, children, color }: QuickActionProps) {
    return (
        <Link
            href={href}
            className={`flex items-center px-4 py-3 rounded-xl shadow-sm border bg-white/80 backdrop-blur-sm hover:bg-gray-50 hover:shadow-md transition-all duration-300 group ${color}`}
        >
            <div className="mr-3 group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <span className="font-medium">{children}</span>
            <svg className="h-5 w-5 ml-auto text-gray-400 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </Link>
    );
}
