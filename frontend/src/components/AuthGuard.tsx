"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Pede para o Supabase verificar se existe alguém logado
      const { data: { session } } = await supabase.auth.getSession();
      
      const isLoginPage = pathname === "/login";

      if (!session && !isLoginPage) {
        // Sem login e fora da página de login = Chuta para o login
        router.replace("/login");
      } else if (session && isLoginPage) {
        // Já tem login e tentou acessar a tela de login = Manda pro Dashboard
        router.replace("/");
      } else {
        // Tudo certo, libera a catraca
        setLoading(false);
      }
    };

    checkAuth();

    // Fica "ouvindo" caso a pessoa clique em um botão de "Sair" (Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && pathname !== "/login") {
        router.replace("/login");
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [pathname, router]);

  // Tela de carregamento enquanto o guarda-costas verifica o crachá
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Libera o conteúdo da página
  return <>{children}</>;
}