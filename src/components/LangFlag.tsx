export function LangFlag({locale}:{locale:string}) {
  const code=["tr","az","en"].includes(locale)?locale:"en";
  return <img className="locale-flag" src={`/flags/${code}.svg?v=2`} width="24" height="18" alt="" aria-hidden="true"/>;
}
