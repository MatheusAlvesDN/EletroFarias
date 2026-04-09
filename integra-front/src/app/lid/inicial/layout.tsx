import React from 'react';
import Navbar from "@/components/lid/inicial/Navbar";
import Footer from "@/components/lid/inicial/Footer";

export default function InicialLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-background dark:bg-stone-950 text-on-surface dark:text-stone-200 font-body selection:bg-secondary-container dark:selection:bg-emerald-800 selection:text-on-secondary-container dark:selection:text-white transition-colors duration-500 min-h-screen flex flex-col">
            <Navbar />
            <div className="flex-grow">
                {children}
            </div>
            <Footer />
        </div>
    );
}