import Link from 'next/link';
import Image from 'next/image';

export default function DownloadAndroidPage() {
  const apkPath = '/downloads/EletroFariasLog.apk';

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#f0f4f8',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 12,
          padding: 24,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Image
            src="/eletro_farias.png"
            alt="Eletro Farias"
            width={360}
            height={360}
            style={{ height: 360, width: 'auto', objectFit: 'contain' }}
            unoptimized // Using unoptimized because external loader might not be configured, or just to be safe with static export
          />
        </div>

        <p style={{ marginTop: 0, color: '#444' }}>
          Clique no botão abaixo para baixar o arquivo <b>.apk</b>.
        </p>

        <a
          href={apkPath}
          download
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 44,
            padding: '0 16px',
            borderRadius: 10,
            background: '#1976d2',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 700,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          BAIXAR APK
        </a>

        {/* Botão Voltar */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 44,
            marginTop: 12,
            padding: '0 16px',
            borderRadius: 10,
            background: '#d32f2f',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 700,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          VOLTAR
        </Link>
      </div>
    </main>
  );
}
