import { GameCanvas } from "./GameCanvas";

interface ZombieModeProps {
  username: string;
  onBack: () => void;
  adminAbuseEvents?: { event_type: string; expires_at: string }[];
  touchscreenMode?: boolean;
  playerSkin?: string;
}

export const ZombieMode = (props: ZombieModeProps) => {
  return (
    <GameCanvas
      mode="zombie"
      username={props.username}
      roomCode=""
      onBack={props.onBack}
      adminAbuseEvents={props.adminAbuseEvents}
      touchscreenMode={props.touchscreenMode}
      playerSkin={props.playerSkin}
    />
  );
};
