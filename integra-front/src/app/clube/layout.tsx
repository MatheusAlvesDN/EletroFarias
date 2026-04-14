import NavbarClube from "@/components/clube/Navbar";
import FooterClube from "@/components/clube/Footer";

export default function ClubeLayout({ children }: { children: React.ReactNode }) {
    return (
        // Fundo cinza claro para destacar os cards brancos
        <div className="bg-gray-50 text-gray-900 min-h-screen flex flex-col font-sans">
            <NavbarClube />
            <main className="flex-grow pt-24 md:pt-32 pb-16">
                {children}
            </main>
            <FooterClube />
        </div>
    );
}