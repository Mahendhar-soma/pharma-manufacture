import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Print Document | Pharma Life Sciences",
};

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-200 print:bg-white">
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-doc { max-width: none !important; padding: 0 !important; margin: 0 !important; }
          aside, header { display: none !important; }
          .lg\\:pl-64 { padding-left: 0 !important; }
        }
        @page { margin: 12mm; }
      `}</style>
      {children}
    </div>
  );
}
