"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../styles/global.css'; // Make sure you import your CSS file

export default function Home() {
  const router = useRouter();

  const handleLogin = () => {
    // You'd typically add your login logic here (e.g., API call, validation)
    // For now, we'll just redirect
    router.push('/inicio'); // Redirect to '/dashboard' page
  };

  return (
    <div className="centered-container">
      <img
        src="https://images.tcdn.com.br/files/1296554/themes/25/img/settings/logo-f-v.png"
        alt="Logo da Empresa"
        className="h-auto w-64 mb-8"
      />

      <div className="form-group">
        <label htmlFor="myInput">Usuario:</label>
        <input type="text" id="myInput" className="input-field" />

        <label htmlFor="myPassword">Senha:</label>
        <input type="password" id="myPassword" className="input-field" />

        <button
          onClick={handleLogin} // Attach the click handler to the button
          className="mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >Entrar
        </button>
      </div>
    </div>
  );
}