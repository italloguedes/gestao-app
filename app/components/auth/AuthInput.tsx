import React from 'react';
import { motion } from 'framer-motion';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon?: React.ReactNode;
    error?: string;
}

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
    ({ label, icon, error, className, ...props }, ref) => {
        return (
            <div className="mb-4 space-y-1">
                <label className="block text-sm font-medium text-slate-300 ml-1">
                    {label}
                </label>
                <div className="relative group">
                    {icon && (
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-400 transition-colors duration-300">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
              w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5
              ${icon ? 'pl-11' : ''}
              text-slate-100 placeholder-slate-500
              focus:bg-slate-800/80 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20
              transition-all duration-300
              hover:border-slate-600
              ${error ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}
              ${className}
            `}
                        {...props}
                    />
                    {/* Futuristic bottom highlight line */}
                    <motion.div
                        className="absolute bottom-0 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-0 group-focus-within:opacity-100"
                        transition={{ duration: 0.3 }}
                    />
                </div>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-red-400 ml-1 font-medium"
                    >
                        {error}
                    </motion.p>
                )}
            </div>
        );
    }
);

AuthInput.displayName = 'AuthInput';
