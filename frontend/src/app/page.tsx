export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-100">

      <h1 className="text-5xl font-bold text-slate-800">
        Pokémon Collection
      </h1>

      <p className="mt-4 text-lg text-slate-600">
        Gerencie sua coleção e acompanhe a evolução dos valores das cartas.
      </p>

      <button
        className="
          mt-10
          rounded-xl
          bg-blue-600
          px-8
          py-3
          text-white
          font-semibold
          transition
          hover:bg-blue-700
        "
      >
        Entrar na coleção
      </button>

    </main>
  );
}