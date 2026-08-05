"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Mail, Lock, Sparkles, LogIn, UserPlus, User } from "lucide-react";

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isRegistering) {
      // Criação de Conta (enviando o nome junto)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name, // Salva o nome no banco de dados
          }
        }
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Conta criada! Pode entrar.");
        setIsRegistering(false); // Volta para a tela de login
      }
    } else {
      // Login normal
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Erro ao fazer login: Verifique suas credenciais.");
      } else {
        toast.success("Bem-vindo de volta!");
        router.push("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center absolute inset-0 z-50 p-4 bg-slate-100 dark:bg-slate-950 transition-colors">
      {/* Fundo dinâmico que muda entre light e dark */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 via-slate-100 to-purple-100/50 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 transition-colors" />
      
      <Card className="w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white/95 dark:bg-card/95 backdrop-blur-md relative z-10 transition-colors">
        <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        
        <CardHeader className="text-center pb-6 pt-8 space-y-3">
          <div className="mx-auto bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mb-2 shadow-inner transform rotate-3 transition-colors">
            <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
            CardDex
          </CardTitle>
          <CardDescription className="text-base font-medium text-slate-500 dark:text-muted-foreground px-2">
            {isRegistering ? "Crie sua conta para começar sua jornada." : "Acesse sua coleção e acompanhe o valor das suas cartas."}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleAuth} className="space-y-5">
            
            {/* Campo Nome só aparece se estiver criando conta */}
            {isRegistering && (
              <div className="space-y-2 relative">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Como quer ser chamado?</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-12 bg-slate-50 dark:bg-background border-slate-200 dark:border-input focus-visible:ring-blue-500 dark:focus-visible:ring-blue-500"
                    required={isRegistering}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2 relative">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <Input
                  type="email"
                  placeholder="treinador@pokemon.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-slate-50 dark:bg-background border-slate-200 dark:border-input focus-visible:ring-blue-500 dark:focus-visible:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 relative">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 bg-slate-50 dark:bg-background border-slate-200 dark:border-input focus-visible:ring-blue-500 dark:focus-visible:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-6">
              <Button type="submit" disabled={loading} className="h-12 font-bold text-md bg-blue-600 hover:bg-blue-700 text-white w-full">
                {loading ? "Aguarde..." : isRegistering ? (
                  <><UserPlus className="mr-2 h-5 w-5" /> Confirmar Cadastro</>
                ) : (
                  <><LogIn className="mr-2 h-5 w-5" /> Entrar na Coleção</>
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsRegistering(!isRegistering)} 
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {isRegistering ? "Já tem uma conta? Faça login" : "Não tem conta? Cadastre-se"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}