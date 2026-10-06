import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-pm flex flex-col items-center py-28 text-center">
      <div className="font-display text-7xl font-extrabold text-mint">404</div>
      <p className="mt-4 text-muted">Sayfa bulunamadı · Page not found · Səhifə tapılmadı</p>
      <Link href="/" className="btn btn-ghost mt-8">← Playmint</Link>
    </div>
  );
}
