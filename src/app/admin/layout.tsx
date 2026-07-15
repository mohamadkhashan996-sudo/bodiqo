/** Root admin segment — no auth gate (console layout handles that). */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
