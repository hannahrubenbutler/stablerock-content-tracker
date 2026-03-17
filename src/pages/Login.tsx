import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="font-display text-primary-foreground text-3xl font-bold tracking-wider mb-2">
            STABLE ROCK
          </h1>
          <div className="h-0.5 w-16 bg-accent mx-auto mb-3" />
          <p className="text-primary-foreground/60 text-sm font-body tracking-wide">
            Content Hub
          </p>
        </div>

        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-lg shadow-xl p-6 space-y-5 border border-border"
        >
          <div className="text-center mb-2">
            <h2 className="text-foreground font-display text-lg font-semibold">Welcome back</h2>
            <p className="text-muted-foreground text-xs font-body mt-1">
              Sign in to your account
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-body font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-body font-medium">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              <p className="text-sm text-destructive font-body">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-primary-foreground/30 text-xs font-body mt-8">
          Managed by Archway Digital
        </p>
      </div>
    </div>
  );
}
