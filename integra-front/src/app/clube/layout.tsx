import NavbarClube from "@/components/clube/Navbar";
import FooterClube from "@/components/clube/Footer";

export default function ClubeLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
            <NavbarClube />
            <main className="flex-grow pt-8 pb-16">
                {children}
            </main>
            <FooterClube />
        </div>
    );
}