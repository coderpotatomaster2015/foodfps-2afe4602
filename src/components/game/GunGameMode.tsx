import { GameCanvas } from "./GameCanvas";

interface GunGameModeProps {
  username: string;
  onBack: () => void;
  adminAbuseEvents?: { event_type: string; expires_at: string }[];
  touchscreenMode?: boolean;
  playerSkin?: string;
}

export const GunGameMode = (props: GunGameModeProps) => {
  return (
    <GameCanvas
      mode="gungame"
      username={props.username}
      roomCode=""
      onBack={props.onBack}
      adminAbuseEvents={props.adminAbuseEvents}
      touchscreenMode={props.touchscreenMode}
      playerSkin={props.playerSkin}
    />
  );
};
