// Wird bei jedem Seitenwechsel neu eingehängt – dadurch blendet jede neue Seite sanft ein.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
