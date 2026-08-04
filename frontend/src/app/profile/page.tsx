"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Lock } from "lucide-react";


export default function ProfilePage() {
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [createdAt, setCreatedAt] = useState("");
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState("");

    const router = useRouter();

    useEffect(() => {
        const loadUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                const userName = user.user_metadata?.full_name || "";

                setName(userName);
                setNewName(userName);
                setEmail(user.email || "");

                setCreatedAt(
                    new Date(user.created_at).toLocaleDateString("pt-BR")
                );
            }

            setLoading(false);
        };

        loadUser();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[70vh]">
                <p>Carregando...</p>
            </div>
        );
    }

    const handleUpdateName = async () => {

        if (!newName.trim()) {
            return;
        }

        const { error } = await supabase.auth.updateUser({
            data: {
                full_name: newName.trim(),
            },
        });

        if (error) {
            toast.error("Erro ao atualizar o nome.");
            return;
        }

        setName(newName.trim());
        setEditingName(false);
        router.refresh();

        toast.success("Nome atualizado com sucesso!");
    };
    return (
        <div className="max-w-3xl mx-auto p-8">

            <div className="mb-8">
                <h1 className="text-3xl font-bold">
                    Minha Conta
                </h1>

                <p className="text-slate-500 mt-1">
                    Gerencie as informações da sua conta.
                </p>
            </div>

            <Card>

                <CardHeader>
                    <CardTitle>Informações da Conta</CardTitle>
                </CardHeader>

                <CardContent className="space-y-8">

                    {/* Nome */}

                    <div>

                        <label className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                            <User size={16} />
                            Nome
                        </label>

                        <input
                            value={editingName ? newName : (name || "Treinador")}
                            onChange={(e) => setNewName(e.target.value)}
                            disabled={!editingName}
                            className={`w-full rounded-lg border px-4 py-3 ${editingName
                                ? "bg-white"
                                : "bg-slate-100 cursor-not-allowed"
                                }`}
                        />

                        <div className="mt-4 flex gap-3">

                            {!editingName ? (

                                <button
                                    onClick={() => setEditingName(true)}
                                    className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 transition"
                                >
                                    Editar nome
                                </button>

                            ) : (

                                <>
                                    <button
                                        onClick={handleUpdateName}
                                        className="rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700 transition"
                                    >
                                        Salvar
                                    </button>

                                    <button
                                        onClick={() => {
                                            setEditingName(false);
                                            setNewName(name);
                                        }}
                                        className="rounded-lg bg-slate-200 px-5 py-2 hover:bg-slate-300 transition"
                                    >
                                        Cancelar
                                    </button>
                                </>

                            )}

                        </div>

                    </div>

                    {/* Email */}

                    <div>

                        <label className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                            <Mail size={16} />
                            Email
                        </label>

                        <input
                            value={email}
                            disabled
                            className="w-full rounded-lg border bg-slate-100 px-4 py-3 text-slate-700 cursor-not-allowed"
                        />

                    </div>

                    {/* Senha */}

                    <div>

                        <label className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                            <Lock size={16} />
                            Senha
                        </label>

                        <input
                            value="••••••••••••"
                            disabled
                            className="w-full rounded-lg border bg-slate-100 px-4 py-3 text-slate-700 cursor-not-allowed"
                        />

                        <button
                            className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-white transition hover:bg-blue-700"
                        >
                            Alterar senha
                        </button>

                    </div>

                    {/* Data */}

                    <div className="border-t pt-6">

                        <p className="text-sm text-slate-500">
                            Conta criada em
                        </p>

                        <p className="font-medium">
                            {createdAt}
                        </p>

                    </div>

                </CardContent>

            </Card>

        </div>
    );
}