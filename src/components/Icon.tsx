import React from 'react';

export const Icon = ({ name, className = "", filled = false, size = "text-2xl" }: { name: string, className?: string, filled?: boolean, size?: string }) => (
    <span className={`material-symbols-outlined ${filled ? 'filled' : ''} ${size} ${className} select-none`}>
        {name}
    </span>
);
