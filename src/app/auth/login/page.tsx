import { LoginForm } from "./ui/LoginForm"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
    
      <LoginForm />

      <div className="md:w-1/2 relative hidden md:block bg-white">
        <h1>Espacio informativo</h1>
      </div>
      
    </div>
  );
}