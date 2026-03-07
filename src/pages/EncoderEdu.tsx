import { useMemo, useState } from "react";
import { ShieldAlert, ListChecks } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const BCRYPT_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

const COMMON_BREACHED_PASSWORDS = [
  "123456",
  "123456789",
  "12345678",
  "password",
  "qwerty",
  "abc123",
  "111111",
  "123123",
  "admin",
  "letmein",
  "welcome",
  "monkey",
  "dragon",
  "baseball",
  "football",
  "iloveyou",
  "master",
  "sunshine",
  "princess",
  "qwertyuiop",
  "passw0rd",
  "zaq12wsx",
  "trustno1",
  "login",
  "freedom",
  "starwars",
  "charlie",
  "donald",
  "superman",
  "whatever",
  "pokemon",
  "internet",
  "computer",
  "hello123",
  "michael",
  "jessica",
  "ashley",
  "nicole",
  "michelle",
  "jordan",
  "mustang",
  "liverpool",
  "chelsea",
  "arsenal",
  "manutd",
  "spiderman",
  "batman",
  "harley",
  "ginger",
  "pepper",
  "secret",
  "shadow",
  "access",
  "bailey",
  "hottie",
  "flower",
  "loveme",
  "654321",
  "987654321",
  "112233",
  "000000",
  "121212",
  "159753",
  "1q2w3e4r",
  "q1w2e3r4",
  "1qaz2wsx",
  "qazwsx",
  "asdfgh",
  "asdfghjkl",
  "zxcvbnm",
  "pass1234",
  "password1",
  "password123",
  "admin123",
  "welcome123",
  "letmein123",
  "changeme",
  "default",
  "temp1234",
  "guest",
  "guest123",
  "user123",
  "root",
  "toor",
  "administrator",
  "test123",
  "testing",
  "qwerty123",
  "summer2024",
  "winter2024",
  "spring2024",
  "autumn2024",
  "newyork",
  "losangeles",
  "london",
  "paris",
  "tokyo",
  "india123",
  "canada123",
  "australia",
  "thomas",
  "daniel",
  "robert",
  "samantha",
  "andrew",
  "jennifer",
  "matthew",
  "joshua",
  "joshua123",
  "killer",
  "killer123",
  "ninja",
  "ninja123",
  "soccer",
  "hockey",
  "basketball",
  "baseball123",
  "hello",
  "hello1234",
  "welcome1",
  "secure123",
  "mybirthday",
  "iloveyou123",
  "family123",
  "password!",
  "P@ssw0rd",
  "P@ssword123",
  "qwerty!",
  "admin@123",
  "123456a",
  "1234qwer",
  "qwe123",
  "zaq1zaq1",
  "11111111",
  "999999",
  "7777777",
  "666666",
  "555555",
  "222222",
  "444444",
  "333333",
  "888888",
  "121314",
  "987654",
  "abcdef",
  "abcdef123",
  "passpass",
  "lovely",
  "pokemon123",
  "minecraft",
  "fortnite",
  "roblox",
  "valorant",
  "counterstrike",
  "onetimepassword",
  "dontusethis",
];

const EncoderEdu = () => {
  const [hash, setHash] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<null | string>(null);

  const hashLooksValid = useMemo(() => BCRYPT_REGEX.test(hash.trim()), [hash]);
  const filteredPasswords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return COMMON_BREACHED_PASSWORDS;
    }

    return COMMON_BREACHED_PASSWORDS.filter((value) => value.toLowerCase().includes(needle));
  }, [search]);

  const explain = () => {
    if (!hashLooksValid) {
      setResult("That input does not match bcrypt hash format.");
      return;
    }

    if (!password.trim()) {
      setResult("Enter a password to continue.");
      return;
    }

    setResult(
      "For safety, this tool does not brute-force or decode hashes. Use your authentication backend to verify a known password with bcrypt.compare()."
    );
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldAlert className="h-5 w-5" />
              Bcrypt is one-way (not decryptable)
            </CardTitle>
            <CardDescription className="text-sm">
              This page does <strong>not</strong> crack hashes or run breach-wordlist attacks. It is an educational
              checker that validates bcrypt hash format and includes a password-awareness list for account hardening.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>encoder.edu</CardTitle>
              <CardDescription>Safety-first bcrypt helper.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hash">Bcrypt hash</Label>
                <Input
                  id="hash"
                  value={hash}
                  onChange={(event) => setHash(event.target.value)}
                  placeholder="$2b$12$....................................................."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Known password (optional input for guidance)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter a password you are authorized to test"
                />
              </div>

              <Button onClick={explain}>Check safely</Button>

              {result && <p className="rounded-md border bg-muted p-3 text-sm">{result}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                Common breached / weak password list
              </CardTitle>
              <CardDescription>
                Use this for awareness and password policy blocking. Never use these as login secrets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="search">Filter list</Label>
              <Input
                id="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find a weak password..."
              />
              <p className="text-xs text-muted-foreground">
                Showing {filteredPasswords.length} of {COMMON_BREACHED_PASSWORDS.length} entries.
              </p>
              <div className="h-96 overflow-auto rounded-md border bg-muted/30 p-3">
                <ul className="space-y-1 font-mono text-sm">
                  {filteredPasswords.map((entry) => (
                    <li key={entry} className="rounded px-2 py-1 hover:bg-muted">
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default EncoderEdu;
