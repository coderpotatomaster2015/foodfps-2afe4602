import { useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useCanvasRecording = (username: string, mode: string) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback((canvas: HTMLCanvasElement) => {
    try {
      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      console.log("Canvas recording started");
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, []);

  const stopRecording = useCallback(async (score: number, kills: number): Promise<void> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        setIsRecording(false);
        resolve();
        return;
      }

      recorder.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

        // Skip very short recordings (< 3 seconds)
        if (durationSeconds < 3 || blob.size < 1000) {
          console.log("Recording too short, skipping upload");
          resolve();
          return;
        }

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            resolve();
            return;
          }

          // Upload to storage
          const fileName = `${user.id}/${Date.now()}_${mode}.webm`;
          const { error: uploadError } = await supabase.storage
            .from("game-recordings")
            .upload(fileName, blob, { contentType: "video/webm" });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            resolve();
            return;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("game-recordings")
            .getPublicUrl(fileName);

          // Save metadata
          await supabase.from("game_recordings").insert({
            user_id: user.id,
            username,
            mode,
            duration_seconds: durationSeconds,
            file_url: urlData.publicUrl,
            file_size: blob.size,
            score,
            kills,
          });

          console.log(`Recording saved: ${durationSeconds}s, ${(blob.size / 1024 / 1024).toFixed(1)}MB`);
        } catch (err) {
          console.error("Error saving recording:", err);
        }
        resolve();
      };

      recorder.stop();
    });
  }, [username, mode]);

  return { startRecording, stopRecording, isRecording };
};
