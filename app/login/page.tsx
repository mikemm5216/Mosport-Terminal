"use client";

import { useRouter } from "next/navigation";
import DisclaimerModal from "@/src/components/DisclaimerModal";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simplified login for V1
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <DisclaimerModal />
      <div className="bg-panel max-w-md w-full p-8 rounded-xl border border-grid shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-widest">MOSPORT</h1>
          <p className="text-secondary-text mt-2">Quantitative Sports Intelligence</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-secondary-text mb-2">Access Key</label>
            <input
              type="password"
              required
              className="w-full bg-background border border-grid rounded-lg px-4 py-3 text-white focus:outline-none focus:border-signal-blue transition-colors min-h-[44px]"
              placeholder="Enter system key..."
            />
          </div>

          <button
            type="submit"
            className="w-full h-[44px] bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
