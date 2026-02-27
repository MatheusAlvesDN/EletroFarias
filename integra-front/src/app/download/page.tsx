import Link from 'next/link';
import Image from 'next/image';

export default function DownloadAndroidPage() {
  const apkPath = '/downloads/EletroFariasLog.apk';

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-slate-50 font-sans">
      <div className="w-full max-w-[520px] bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image
            src="/eletro_farias.png"
            alt="Eletro Farias"
            width={360}
            height={360}
            className="h-[360px] w-auto object-contain"
            priority
          />
        </div>

        <p className="mt-0 text-slate-700 mb-4">
          Clique no botão abaixo para baixar o arquivo <b>.apk</b>.
        </p>

        <a
          href={apkPath}
          download
          className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-blue-600 text-white font-bold w-full hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          BAIXAR APK
        </a>

        {/* Botão Voltar */}
        <Link
          href="/"
          className="inline-flex items-center justify-center h-11 mt-3 px-4 rounded-xl bg-red-600 text-white font-bold w-full hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          VOLTAR
        </Link>
      </div>
    </main>
  );
}
