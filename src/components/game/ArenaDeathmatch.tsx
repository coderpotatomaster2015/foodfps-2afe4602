import { GameCanvas } from "./GameCanvas";

interface ArenaDeathmatchProps {
  username: string;
  onBack: () => void;
  adminAbuseEvents?: { event_type: string; expires_at: string }[];
  touchscreenMode?: boolean;
  playerSkin?: string;
}

export const ArenaDeathmatch = (props: ArenaDeathmatchProps) => {
  return (
    <GameCanvas
      mode="arena"
      username={props.username}
      roomCode=""
      onBack={props.onBack}
      adminAbuseEvents={props.adminAbuseEvents}
      touchscreenMode={props.touchscreenMode}
      playerSkin={props.playerSkin}
    />
  );
};
