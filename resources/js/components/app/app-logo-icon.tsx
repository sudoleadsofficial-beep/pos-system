import { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="128" height="128" rx="28" fill="#166534" />
            <path d="M30 32 L53 96 H75 L98 32 H80 L64 77 L48 32 Z" fill="#ffffff" />
        </svg>
    );
}
