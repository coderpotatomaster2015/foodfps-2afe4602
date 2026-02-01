import { useState } from "react";
import { 
  Mail, Sparkles, Globe, Palette, Trophy, Gift, FlaskConical, 
  Settings, ChevronLeft, ChevronRight, MessageCircle, Ticket, CalendarDays,
  Utensils, User, Swords, Backpack, Store
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
  onShowEventSchedule: () => void;
  onShowFoodPass: () => void;
  onShowProfile: () => void;
  onShowRanked: () => void;
  onShowInventory?: () => void;
  onShowItemShop?: () => void;
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
  onShowEventSchedule,
  onShowFoodPass,
  onShowProfile,
  onShowRanked,
  onShowInventory,
  onShowItemShop,
}: GameSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  // Organized menu items by category
  const mainItems = [
    { icon: Swords, label: "Ranked", onClick: onShowRanked },
    { icon: Trophy, label: "Leaderboard", onClick: onShowLeaderboard },
    { icon: Utensils, label: "Food Pass", onClick: onShowFoodPass },
  ];

  const shopItems = [
    { icon: Palette, label: "Skins", onClick: onShowSkinsShop },
    ...(onShowItemShop ? [{ icon: Store, label: "Item Shop", onClick: onShowItemShop }] : []),
    ...(onShowInventory ? [{ icon: Backpack, label: "Inventory", onClick: onShowInventory }] : []),
  ];

  const socialItems = [
    { icon: Mail, label: "Messages", onClick: onShowMessages, badge: unreadMessages > 0 ? unreadMessages : null },
    { icon: MessageCircle, label: "Global Chat", onClick: onShowGlobalChat },
    { icon: Globe, label: "Social", onClick: onShowSocial },
  ];

  const rewardsItems = [
    { icon: Gift, label: "Daily Rewards", onClick: onShowDailyRewards },
    { icon: Ticket, label: "Redeem Code", onClick: onShowRedeemCodes },
    { icon: CalendarDays, label: "Events", onClick: onShowEventSchedule },
  ];

  const otherItems = [
    { icon: User, label: "My Profile", onClick: onShowProfile },
    { icon: Sparkles, label: "Updates", onClick: onShowUpdates },
    ...(isBetaTester || isAdmin ? [{ icon: FlaskConical, label: "Beta", onClick: onShowBetaPanel }] : []),
    { icon: Settings, label: "Settings", onClick: onShowSettings },
  ];

  const renderSection = (items: any[], label?: string) => (
    <div className="py-1">
      {!collapsed && label && (
        <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
      )}
      {items.map((item, index) => (
        <button
          key={index}
          onClick={item.onClick}
          className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 transition-colors relative ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm">{item.label}</span>}
          {item.badge && (
            <span className={`absolute ${collapsed ? "top-1 right-1" : "right-2"} bg-destructive text-destructive-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center`}>
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div 
      className={`fixed left-0 top-1/2 transform -translate-y-1/2 z-40 transition-all duration-300 ${
        collapsed ? "w-12" : "w-44"
      }`}
    >
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-r-lg shadow-lg overflow-hidden max-h-[80vh] flex flex-col">
        {/* Toggle button */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="w-full p-2 flex items-center justify-center hover:bg-secondary/50 transition-colors border-b border-border flex-shrink-0"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Scrollable menu sections */}
        <div className="overflow-y-auto flex-1 scrollbar-thin">
          {renderSection(mainItems, "Play")}
          <div className="border-t border-border/50" />
          {renderSection(shopItems, "Shop")}
          <div className="border-t border-border/50" />
          {renderSection(socialItems, "Social")}
          <div className="border-t border-border/50" />
          {renderSection(rewardsItems, "Rewards")}
          <div className="border-t border-border/50" />
          {renderSection(otherItems, "More")}
        </div>
      </div>
    </div>
  );
};
