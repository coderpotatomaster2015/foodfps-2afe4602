import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface WebsiteDisabledProps {
  message?: string;
}

export const WebsiteDisabled = ({ message }: WebsiteDisabledProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 bg-card border-border">
        <div className="w-16 h-16 mx-auto bg-destructive/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Website Disabled</h1>
          <p className="text-muted-foreground">
            {message || "Sorry, the website is currently disabled. Please ask an admin to enable it."}
          </p>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            If you are an admin, please log in to access the admin panel and enable the website.
          </p>
        </div>
      </Card>
    </div>
  );
};
