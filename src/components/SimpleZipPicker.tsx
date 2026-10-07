"use client";
import {useState} from "react";
import {StudioIcon} from "./Studio";
export function SimpleZipPicker({locale,maxMb}:{locale:string;maxMb:number}){const [name,setName]=useState("");const en=locale==="en",az=locale==="az";return <label className="zip-picker"><StudioIcon name="upload"/><strong>{name||(en?"Choose ZIP file":az?"ZIP faylı seç":"ZIP dosyası seç")}</strong><span>{name?(en?"Click to replace":az?"Dəyişmək üçün klik et":"Değiştirmek için tıkla"):`HTML · Vite · Node.js / ${maxMb} MB`}</span><input name="zip" type="file" accept=".zip,application/zip" required aria-label={en?"Game ZIP":az?"Oyun ZIP faylı":"Oyun ZIP dosyası"} onChange={e=>setName(e.target.files?.[0]?.name??"")}/></label>;}
