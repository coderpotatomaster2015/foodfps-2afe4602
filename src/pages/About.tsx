const About = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-xl w-full rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-3xl font-bold mb-3">About Food FPS</h1>
        <p className="text-muted-foreground">
          Made by{" "}
          <a
            href="https://victories.games"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            victories
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default About;
