import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Request a Quotation | Santhaya Associates Pvt. Ltd.',
  description:
    'Submit technical requirements and equipment specifications for government/private construction tenders and industrial machinery supply.',
};

export default function QuotationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
