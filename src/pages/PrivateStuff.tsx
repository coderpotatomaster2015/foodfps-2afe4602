import { FormEvent, useState } from "react";

const ACCESS_PASSWORD = "DonutSmp12!67kidisthebest@lwsdvictories.games";

const PrivateStuff = () => {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password === ACCESS_PASSWORD) {
      setIsAuthenticated(true);
      setError("");
      return;
    }

    setError("Incorrect password.");
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm space-y-4"
        >
          <h1 className="text-xl font-semibold">Private Access</h1>
          <p className="text-sm text-muted-foreground">Enter the password to continue.</p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm"
          >
            Unlock
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <pre className="whitespace-pre-wrap text-base">
{`Username: ADMINYUNUS
Password: ADMIN1082698

Username: D3F4ULT
Password: I_AM_D3F4ULT

Username: AMIR
Password: amir.com`}
      </pre>
    </main>
  );
};

export default PrivateStuff;
