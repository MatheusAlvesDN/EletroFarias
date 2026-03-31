import Navbar from "@/components/lid/Navbar"; // Ajuste o caminho se necessário
import Footer from "@/components/lid/Footer"; // Ajuste o caminho se necessário
import { Inter } from "next/font/google";
import "../../globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function FigmaLayout({ children }: { children: React.ReactNode }) {
  return (
    // Substituímos <html> e <body> por uma <div> que engloba tudo!
    <div className={`${inter.className} bg-white text-black antialiased min-h-screen`}>
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}