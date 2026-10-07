import {Space_Grotesk, DM_Sans} from 'next/font/google';
import {cookies,headers} from 'next/headers';
import {isLocale,localeCookie} from '@/lib/i18n/config';
import './globals.css';
const display=Space_Grotesk({variable:'--font-heading',subsets:['latin','latin-ext'],display:'swap'});
const body=DM_Sans({variable:'--font-body',subsets:['latin','latin-ext'],display:'swap'});
export default async function RootLayout({children}:{children:React.ReactNode}){
 const preferred=(await headers()).get('x-playmint-locale')||(await cookies()).get(localeCookie)?.value;
 return <html lang={isLocale(preferred)?preferred:'tr'} className={`${display.variable} ${body.variable}`}><head><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7307363660550938" crossOrigin="anonymous"/></head><body className="flex min-h-screen flex-col">{children}</body></html>;
}
