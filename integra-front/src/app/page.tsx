"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";                // use <Image />
import "../styles/global.css";

export default function Home() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/inicio");
  };

  return (
    <div className="centered-container">
      <Image
        src="https://images.tcdn.com.br/files/1296554/themes/25/img/settings/logo-f-v.png"
        alt="Logo da Empresa"
        width={256}
        height={96}
        className="h-auto w-64 mb-8"
        priority
      />

      <div className="form-group">
        <label htmlFor="myInput">Email:</label>
        <input type="text" id="myInput" className="input-field" />

        <label htmlFor="myPassword">Senha:</label>
        <input type="password" id="myPassword" className="input-field" />

        <button
          onClick={handleLogin}
          className="mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}