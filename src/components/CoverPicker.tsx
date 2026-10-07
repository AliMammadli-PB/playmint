"use client";
import {useEffect,useState} from 'react';
export function CoverPicker({locale,required=true}:{locale:string;required?:boolean}){
 const [preview,setPreview]=useState<string|null>(null);useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);const en=locale==='en',az=locale==='az';
 return <div className="space-y-3"><label className="label" htmlFor="cover">{en?'Game cover':az?'Oyun üz qabığı':'Oyun kapağı'} {required&&'*'}</label>{preview&&<img src={preview} alt={en?'Cover preview':'Kapak önizlemesi'} className="aspect-video w-full rounded-xl object-cover"/>}<input id="cover" name="cover" type="file" accept="image/png,image/jpeg,image/webp" required={required} className="input" onChange={e=>{const file=e.currentTarget.files?.[0];setPreview(file?URL.createObjectURL(file):null);}}/><p className="hint">{en?'PNG, JPG or WebP · up to 2 MB. A 16:9 cover works best.':az?'PNG, JPG və ya WebP · ən çox 2 MB. 16:9 üz qabığı tövsiyə edilir.':'PNG, JPG veya WebP · en fazla 2 MB. 16:9 kapak önerilir.'}</p></div>;
}
