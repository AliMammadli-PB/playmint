export function parseSupport(value:FormDataEntryValue|null,required=false):boolean|null{
 if(value==='yes')return true;if(value==='no')return false;if(!required&&(value===null||value===''))return null;throw new Error('capability_required');
}
