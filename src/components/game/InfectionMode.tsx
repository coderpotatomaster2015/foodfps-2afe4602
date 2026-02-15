import { GameCanvas } from "./GameCanvas";

interface InfectionModeProps {
  username: string;
  onBack: () => void;
  adminAbuseEvents?: { event_type: string; expires_at: string }[];
  touchscreenMode?: boolean;
  playerSkin?: string;
}

export const InfectionMode = (props: InfectionModeProps) => {
  return (
    <GameCanvas
      mode="infection"
      username={props.username}
      roomCode=""
      onBack={props.onBack}
      adminAbuseEvents={props.adminAbuseEvents}
      touchscreenMode={props.touchscreenMode}
      playerSkin={props.playerSkin}
    />
  );
};
