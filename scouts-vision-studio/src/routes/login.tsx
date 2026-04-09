import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroImage from "@/assets/hero-scout.jpg";
import { AuthFormBrandRibbon } from "@/components/site/BrandLockup";
import { getSupabaseClient } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setPendingMessage(null);
    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const userId = data.user?.id;

      if (!userId) {
        throw new Error("Authenticated user ID is missing.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (profile?.status === "approved") {
        if (search.redirect) {
          window.location.href = search.redirect;
          return;
        }

        await navigate({ to: "/workspace/overview" });
        return;
      }

      await supabase.auth.signOut();
      setPendingMessage("Your access request has been sent to the Scouts Grombalia Admin. Please wait for approval.");
    } catch (error) {
      console.dir(error);
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Login failed. Please check your credentials and try again.";
      const isInvalidCredentials = message.toLowerCase().includes("invalid login credentials");
      setErrorMessage(isInvalidCredentials ? "Invalid login credentials." : message);
      alert(isInvalidCredentials ? "Invalid login credentials." : "Unable to log in right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(at_top_left,_#ffffff,_#fdf2f2,_#f3f1f2)] text-[#2a2629]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden lg:block">
          <img
            src={heroImage}
            alt="Scout leaders in formation"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#2a2629]/72 via-[#2a2629]/40 to-[#ca0314]/20" />
          <div className="absolute inset-0 mesh-glow opacity-60" />
          <div className="pointer-events-none absolute inset-0">
            <span className="float-slow absolute left-12 top-16 border border-white/20 bg-white/8 px-4 py-2 text-sm tracking-[0.2em] text-white/85 backdrop-blur-md rounded-md">
              VISION
            </span>
            <span className="float-slower absolute right-16 top-1/3 border border-white/20 bg-white/8 px-4 py-2 text-sm tracking-[0.2em] text-white/85 backdrop-blur-md rounded-md">
              LEADERSHIP
            </span>
            <span className="float-slow absolute left-20 bottom-28 border border-white/20 bg-white/8 px-4 py-2 text-sm tracking-[0.2em] text-white/85 backdrop-blur-md rounded-md">
              UNITY
            </span>
            <span className="float-slower absolute right-20 bottom-16 border border-white/20 bg-white/8 px-4 py-2 text-sm tracking-[0.2em] text-white/85 backdrop-blur-md rounded-md">
              COORDINATION
            </span>
          </div>
        </section>

        <section className="relative flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="absolute inset-0 mesh-glow opacity-45" />
          <div className="glass-card fade-up relative z-10 w-full max-w-md rounded-md border border-[#2a2629]/10 p-8 shadow-[0_20px_60px_-30px_rgba(42,38,41,0.45)] sm:p-10">
            <div className="mb-6 flex justify-end">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-md border border-[#2a2629]/12 bg-white/80 px-3 py-2 text-sm font-medium text-[#2a2629] transition hover:border-[#ca0314]/35 hover:bg-white hover:text-[#ca0314]"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                Back to home
              </Link>
            </div>
            <div className="mb-8 space-y-4">
              <AuthFormBrandRibbon />
              <h1 className="font-display text-4xl leading-tight text-[#2a2629]">Welcome Back</h1>
              <p className="text-sm leading-relaxed text-stone-warm">
                Access your leadership workspace.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-2.5">
                <label htmlFor="email" className="text-sm font-medium text-[#2a2629]">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-11 rounded-md border-[#2a2629]/15 bg-white/70 text-[#2a2629] placeholder:text-stone-warm focus-visible:ring-[#2a2629]/25"
                />
              </div>
              <div className="space-y-2.5">
                <label htmlFor="password" className="text-sm font-medium text-[#2a2629]">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-11 rounded-md border-[#2a2629]/15 bg-white/70 text-[#2a2629] placeholder:text-stone-warm focus-visible:ring-[#2a2629]/25"
                />
              </div>
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 w-full rounded-md bg-[#ca0314] text-white shadow-none hover:bg-[#b60212]"
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </div>
              <div className="pt-1 text-right">
                <a href="#" className="text-sm text-stone-warm transition-colors hover:text-[#2a2629]">
                  Forgot Password?
                </a>
              </div>
            </form>

            {pendingMessage ? (
              <div role="status" className="mt-5 rounded-md border border-[#2a2629]/10 bg-white/70 p-4">
                <p className="text-sm font-medium text-[#2a2629]">Access Pending</p>
                <p className="mt-1 text-sm text-stone-warm">{pendingMessage}</p>
              </div>
            ) : null}

            {errorMessage ? (
              <div role="alert" className="mt-5 rounded-md border border-[#ca0314]/25 bg-[#ca0314]/5 p-4">
                <p className="text-sm text-stone-warm">{errorMessage}</p>
              </div>
            ) : null}

            <p className="mt-7 text-center text-sm text-stone-warm">
              Don't have an account?{" "}
              <Link to="/signup" className="font-medium text-[#ca0314] hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
