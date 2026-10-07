import {resolveLocale} from "@/lib/i18n";
import {ContactForm} from "./ContactForm";
export default async function Report({params}:PageProps<"/[locale]/report">){const {locale}=await resolveLocale(params);return <section className="legal-copy"><h1>{locale==="en"?"How can we help?":locale==="az"?"Necə kömək edə bilərik?":"Nasıl yardımcı olabiliriz?"}</h1><p>support@playmint.tr · legal@playmint.tr</p><div className="mt-8"><ContactForm locale={locale}/></div></section>}
