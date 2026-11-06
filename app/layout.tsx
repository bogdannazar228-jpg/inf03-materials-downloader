import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'INF.03 — материалы к экзамену', description:'Аркуши, ключи и материалы к заданиям INF.03'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="ru"><body>{children}</body></html>}
