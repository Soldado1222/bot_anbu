export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-discord-notquiteblack to-discord-notquitedark">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-discord-blurple border-t-transparent"></div>
        <p className="mt-4 text-gray-400 text-lg">Chargement...</p>
      </div>
    </div>
  );
}
