import Navbar from "@/components/lid/figma/Navbar"; // Ajuste o caminho se necessário
import Footer from "@/components/lid/figma/Footer"; // Ajuste o caminho se necessário
import "../../globals.css";


export default function FigmaLayout({ children }: { children: React.ReactNode }) {
  return (
    // Substituímos <html> e <body> por uma <div> que engloba tudo!
    <div className="bg-white text-black antialiased min-h-screen">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}