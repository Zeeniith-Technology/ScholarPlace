import type { Metadata } from "next";
import CRMLayoutWrapper from '@/components/crm/layout/CRMLayoutWrapper';

export const metadata: Metadata = {
  title: "ScholarPlace CRM",
  description: "Internal CRM for ScholarPlace",
};

export default function CRMRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="crm-root font-sans text-gray-900 bg-gray-50">
      <CRMLayoutWrapper>
        {children}
      </CRMLayoutWrapper>
    </div>
  );
}
