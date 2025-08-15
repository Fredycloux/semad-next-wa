import AdminNav from "@/components/AdminNav";

export const metadata = {
  title: "Admin | SEMAD",
};

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-3 py-6">{children}</main>
    </div>
  );
}
