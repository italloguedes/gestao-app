import { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Login - Gestão App",
  description: "Faça login para acessar o sistema",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
            Bem-vindo
          </h1>
          <p className="mt-2 text-gray-600">Faça login para acessar sua conta</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
} 