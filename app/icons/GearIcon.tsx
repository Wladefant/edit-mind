
import React from 'react';

export const GearIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 20V14" />
    <path d="M12 8V2" />
    <path d="M18 14V12" />
    <path d="M6 12v2" />
    <path d="m18 18-2-2" />
    <path d="m6 6 2 2" />
    <path d="m18 6-2 2" />
    <path d="m6 18 2-2" />
    <path d="M12 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
    <path d="M12 12a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z" />
  </svg>
);
