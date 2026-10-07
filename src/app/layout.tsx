import {Montserrat} from 'next/font/google';
import {cookies,headers} from 'next/headers';
import {isLocale,localeCookie} from '@/lib/i18n/config';
import './globals.css';
const font=Montserrat({variable:'--font-montserrat',subsets:['latin','latin-ext'],display:'swap',preload:false});
export default async function RootLayout({children}:{children:React.ReactNode}){
 const preferred=(await headers()).get('x-playmint-locale')||(await cookies()).get(localeCookie)?.value;
 return <html lang={isLocale(preferred)?preferred:'tr'} className={`${font.variable} ${font.className}`}><head><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7307363660550938" crossOrigin="anonymous"/></head><body className="flex min-h-screen flex-col">{children}</body></html>;
}
