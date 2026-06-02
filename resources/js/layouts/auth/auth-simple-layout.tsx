import AppLogoIcon from '@/components/app-logo-icon';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div
            className="flex min-h-svh flex-row items-center justify-evenly"
            style={{
                backgroundImage: "url('/images/background.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <div className='items-center'>
                <h1 className="font-bold text-white uppercase" style={{ fontSize: '5rem' }}>DeepCroop</h1>
            </div>

            <div className="w-full max-w-md">
                <div className="flex flex-col gap-4 p-6 bg-white/90 rounded-lg shadow-md">
                    <div className="flex flex-row items-center gap-2">
                        <h1 className="text-xl font-bold uppercase text-center text-dark-background">
                            Sistema de análisis de imágenes satelitales
                        </h1>
                        <div className="mb-1 flex items-center justify-center rounded-md">
                            <AppLogoIcon className="w-50 h-30" />
                        </div>
                    </div>
                    {(title && description) && (
                        <div className='flex flex-col items-center border-b-2 border-t-2 p-2'>
                            <h1 className="font-bold uppercase" style={{ fontSize: '1rem' }}>{title}</h1>
                            <h2 style={{ fontSize: '1rem', textAlign: 'center' }}>{description}</h2>
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
}
