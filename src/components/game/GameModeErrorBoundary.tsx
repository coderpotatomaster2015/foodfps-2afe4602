import React from "react";
import { Button } from "@/components/ui/button";

interface GameModeErrorBoundaryProps {
  children: React.ReactNode;
  onBackToMenu: () => void;
  modeName?: string | null;
}

interface GameModeErrorBoundaryState {
  hasError: boolean;
}

export class GameModeErrorBoundary extends React.Component<GameModeErrorBoundaryProps, GameModeErrorBoundaryState> {
  constructor(props: GameModeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): GameModeErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Gamemode crashed:", error, errorInfo);
  }

  componentDidUpdate(prevProps: GameModeErrorBoundaryProps) {
    if (prevProps.modeName !== this.props.modeName && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="fixed inset-0 z-50 bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-4">
          <h2 className="text-2xl font-bold">Gamemode crashed</h2>
          <p className="text-white/80">
            We hit an unexpected rendering error in {this.props.modeName || "this mode"}. Go back to menu and try another mode.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => this.setState({ hasError: false })}>Try Again</Button>
            <Button onClick={this.props.onBackToMenu}>Back to Menu</Button>
          </div>
        </div>
      </div>
    );
  }
}
