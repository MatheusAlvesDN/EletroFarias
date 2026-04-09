import React from 'react';
import Navbar from "@/components/lid/inicial/Navbar";
import Footer from "@/components/lid/inicial/Footer";

export default function InicialLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-background text-on-surface font-body selection:bg-secondary-container selection:text-on-secondary-container min-h-screen flex flex-col">
            <Navbar />
            <div className="flex-grow">
                {children}
            </div>
            <Footer />
        </div>
    );
}