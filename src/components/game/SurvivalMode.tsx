import { GameCanvas } from "./GameCanvas";

interface SurvivalModeProps {
  username: string;
  onBack: () => void;
  adminAbuseEvents?: { event_type: string; expires_at: string }[];
  touchscreenMode?: boolean;
  playerSkin?: string;
}

export const SurvivalMode = (props: SurvivalModeProps) => {
  return (
    <GameCanvas
      mode="survival"
      username={props.username}
      roomCode=""
      onBack={props.onBack}
      adminAbuseEvents={props.adminAbuseEvents}
      touchscreenMode={props.touchscreenMode}
      playerSkin={props.playerSkin}
    />
  );
};
