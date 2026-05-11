export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 bg-background text-center">
      <div className="font-headline font-black text-primary-container italic text-4xl mb-4">1UP</div>
      <h1 className="font-headline font-black text-3xl uppercase tracking-tighter mb-2">
        Sin conexión
      </h1>
      <div className="h-1 w-16 bg-primary-container mx-auto mb-6" />
      <p className="font-body text-on-surface/50 text-sm max-w-xs">
        No tienes conexión a internet. Vuelve a intentarlo cuando estés conectado.
      </p>
    </div>
  );
}
