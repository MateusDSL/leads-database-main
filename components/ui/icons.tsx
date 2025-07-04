// components/ui/icons.tsx

import React from 'react';

// Este é um componente funcional que retorna o SVG do ícone do Google.
// Usamos React.SVGProps para que possamos passar propriedades como className, se necessário.
export const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <title>Google</title>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.3 1.62-3.85 1.62-4.64 0-8.59-3.82-8.59-8.59s3.95-8.59 8.59-8.59c2.52 0 4.22.98 5.4 2.01l2.6-2.6C18.09 1.76 15.47 0 12.48 0 5.88 0 .04 5.88.04 12.5s5.84 12.5 12.44 12.5c3.27 0 5.74-1.15 7.6-3.05 1.96-1.96 2.56-4.94 2.56-7.66 0-.85-.09-1.35-.19-1.84h-9.9z" fill="#4285F4"/>
  </svg>
);