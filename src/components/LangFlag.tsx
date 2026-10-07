export function LangFlag({locale}:{locale:string}) {
  const code=["tr","az","en"].includes(locale)?locale:"en";
  return <img className="locale-flag" src={`/flags/${code}.svg`} width="24" height="16" alt="" aria-hidden="true"/>;
}
