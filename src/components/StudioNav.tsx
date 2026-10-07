"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {StudioIcon} from "./Studio";
export function StudioNav({base,items}:{base:string;items:{path:string;label:string;icon:string}[]}){const pathname=usePathname();return <nav className="studio-nav">{items.map(i=>{const href=base+i.path,active=i.path?pathname.startsWith(href):pathname===href;return <Link key={href} href={href} aria-current={active?"page":undefined} className={active?"selected":""}><StudioIcon name={i.icon}/>{i.label}</Link>;})}</nav>;}
