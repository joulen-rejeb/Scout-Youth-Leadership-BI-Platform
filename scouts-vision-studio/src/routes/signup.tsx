import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import communityImage from "@/assets/community.jpg";
import { AuthFormBrandRibbon } from "@/components/site/BrandLockup";
import { getSupabaseClient } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessRequested, setAccessRequested] = useState(false);

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setAccessRequested(false);
    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            status: "pending",
          },
        },
      });

      if (error) {
        throw error;
      }

      const userId = data.user?.id;

      if (!userId) {
        throw new Error("User ID was not returned from Supabase sign up.");
      }

      const { error: createProfileError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: fullName,
        email,
        role,
        status: "pending",
      });

      if (createProfileError) {
        console.error("Database Error:", createProfileError);
        throw createProfileError;
      }

      setAccessRequested(true);
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("");
    } catch (error) {
      console.dir(error);
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Unable to request access. Please try again.";
      alert(message);
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(at_top_left,_#ffffff,_#fdf2f2,_#f3f1f2)] text-[#2a2629]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden lg:block">
          <img
            src={communityImage}
            alt="Scouts community in coordinated action"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#2a2629]/72 via-[#2a2629]/40 to-[#ca0314]/18" />
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
              <h1 className="font-display text-4xl leading-tight text-[#2a2629]">Create Account</h1>
              <p className="text-sm leading-relaxed text-stone-warm">
                Entering a modern digital leadership ecosystem for Scouts Grombalia.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSignUp}>
              <div className="space-y-2.5">
                <label htmlFor="fullName" className="text-sm font-medium text-[#2a2629]">
                  Full name
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  className="h-11 rounded-md border-[#2a2629]/15 bg-white/70 text-[#2a2629] placeholder:text-stone-warm focus-visible:ring-[#2a2629]/25"
                />
              </div>
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
                  placeholder="Create a password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  className="h-11 rounded-md border-[#2a2629]/15 bg-white/70 text-[#2a2629] placeholder:text-stone-warm focus-visible:ring-[#2a2629]/25"
                />
              </div>
              <div className="space-y-2.5">
                <label htmlFor="role" className="text-sm font-medium text-[#2a2629]">
                  Role Selection
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  required
                  className="h-11 w-full rounded-md border border-[#2a2629]/15 bg-white/70 px-3 text-sm text-[#2a2629] focus:outline-none focus:ring-1 focus:ring-[#2a2629]/25"
                >
                  <option value="" disabled>
                    Select your leadership role
                  </option>
                  <option value="group-leader">Group Leader</option>
                  <option value="finance-manager">Finance Manager</option>
                  <option value="unit-leader">Unit Leader</option>
                </select>
              </div>
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 w-full rounded-md bg-[#ca0314] text-white shadow-none hover:bg-[#b60212]"
                >
                  {isLoading ? "Submitting..." : "Request Access"}
                </Button>
              </div>
            </form>

            {accessRequested ? (
              <div className="mt-5 rounded-md border border-[#2a2629]/10 bg-white/70 p-4">
                <p className="text-sm font-medium text-[#2a2629]">Access Requested</p>
                <p className="mt-1 text-sm text-stone-warm">
                  Your access request has been sent to the Scouts Grombalia Admin. Please wait for approval.
                </p>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-5 rounded-md border border-[#ca0314]/25 bg-[#ca0314]/5 p-4">
                <p className="text-sm font-medium text-[#2a2629]">Unable to request access</p>
                <p className="mt-1 text-sm text-stone-warm">{errorMessage}</p>
              </div>
            ) : null}

            <p className="mt-6 text-center text-xs leading-relaxed tracking-[0.01em] text-stone-warm">
              This platform is reserved for authorized leadership members.
            </p>
            <p className="mt-3 text-center text-sm text-stone-warm">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-[#ca0314] hover:underline">
                Login
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
