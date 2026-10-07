export function VersionTimeline({locale,report,status}:{locale:string;report:{virustotal?:{status?:string};sourceRemovedAt?:string};status:string}){
 const copy=locale==="en"?["Uploaded","Security scan","Admin review","Playable output kept"]:locale==="az"?["Yükləndi","Təhlükəsizlik taraması","Admin yoxlaması","Oyun çıxışı saxlanıldı"]:["Yüklendi","Güvenlik taraması","Admin incelemesi","Oyun çıktısı saklandı"];
 const done=[true,report.virustotal?.status==="completed",status==="approved"||status==="rejected",!!report.sourceRemovedAt];
 return <ol className="status-timeline">{copy.map((label,i)=><li data-complete={done[i]} key={label}><span>{done[i]?"✓":i+1}</span>{label}</li>)}</ol>;
}
