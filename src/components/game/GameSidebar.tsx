import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Mail, Sparkles, Globe, Palette, Trophy, Gift, FlaskConical, 
  Settings, ChevronLeft, ChevronRight, MessageCircle, Ticket 
} from "lucide-react";

interface GameSidebarProps {
  unreadMessages: number;
  isAdmin: boolean;
  isBetaTester: boolean;
  onShowMessages: () => void;
  onShowUpdates: () => void;
  onShowSocial: () => void;
  onShowSkinsShop: () => void;
  onShowLeaderboard: () => void;
  onShowDailyRewards: () => void;
  onShowBetaPanel: () => void;
  onShowSettings: () => void;
  onShowGlobalChat: () => void;
  onShowRedeemCodes: () => void;
}

export const GameSidebar = ({
  unreadMessages,
  isAdmin,
  isBetaTester,
  onShowMessages,
  onShowUpdates,
  onShowSocial,
  onShowSkinsShop,
  onShowLeaderboard,
  onShowDailyRewards,
  onShowBetaPanel,
  onShowSettings,
  onShowGlobalChat,
  onShowRedeemCodes,
}: GameSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { icon: Mail, label: "Messages", onClick: onShowMessages, badge: unreadMessages > 0 ? unreadMessages : null },
    { icon: MessageCircle, label: "Global Chat", onClick: onShowGlobalChat },
    { icon: Sparkles, label: "Updates", onClick: onShowUpdates },
    { icon: Globe, label: "Social", onClick: onShowSocial },
    { icon: Palette, label: "Shop", onClick: onShowSkinsShop },
    { icon: Trophy, label: "Leaderboard", onClick: onShowLeaderboard },
    { icon: Gift, label: "Daily Rewards", onClick: onShowDailyRewards },
    { icon: Ticket, label: "Redeem Code", onClick: onShowRedeemCodes },
    ...(isBetaTester || isAdmin ? [{ icon: FlaskConical, label: "Beta", onClick: onShowBetaPanel }] : []),
    { icon: Settings, label: "Settings", onClick: onShowSettings },
  ];

  return (
    <div 
      className={`fixed left-0 top-1/2 transform -translate-y-1/2 z-40 transition-all duration-300 ${
        collapsed ? "w-12" : "w-48"
      }`}
    >
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-r-lg shadow-lg overflow-hidden">
        {/* Toggle button */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="w-full p-2 flex items-center justify-center hover:bg-secondary/50 transition-colors border-b border-border"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Menu items */}
        <div className="py-2 space-y-1">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 transition-colors relative ${
                collapsed ? "justify-center" : ""
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
              {item.badge && (
                <span className={`absolute ${collapsed ? "top-1 right-1" : "right-2"} bg-destructive text-destructive-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
