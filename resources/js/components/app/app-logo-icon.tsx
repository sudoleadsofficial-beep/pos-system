import { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="10" fill="#059669" />
            <path d="M12 24C12 16 22 12 34 13C34 25 28 35 18 35C14.6863 35 12 30.0751 12 24Z" fill="white" />
            <path d="M20 31C24 27 28 21 31 16" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
            <text x="24" y="44" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">JKC</text>
        </svg>
    );
}
