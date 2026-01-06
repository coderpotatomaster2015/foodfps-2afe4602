import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdSignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdSignupModal = ({ open, onOpenChange }: AdSignupModalProps) => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Get user's username
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast.error("Profile not found");
        return;
      }

      // Check if already submitted
      const { data: existing } = await supabase
        .from("ad_signups")
        .select("id, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        if (existing.status === "pending") {
          toast.info("Your request is already pending review");
        } else if (existing.status === "approved") {
          toast.success("Your ads are already disabled!");
        } else {
          toast.error("Your previous request was declined");
        }
        onOpenChange(false);
        return;
      }

      // Submit signup request
      const { error } = await supabase.from("ad_signups").insert({
        user_id: user.id,
        username: profile.username,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Request submitted! An admin will review it soon.");
    } catch (error) {
      console.error("Error submitting signup:", error);
      toast.error("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove Ads</DialogTitle>
          <DialogDescription>
            Submit a request to have ads disabled for your account. An admin will review and approve your request.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Request Submitted!</h3>
            <p className="text-muted-foreground">
              An admin will review your request and notify you when it's approved.
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              By submitting this request, you confirm that you want to remove ads from your experience.
              Your username will be sent to the admin for verification.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};