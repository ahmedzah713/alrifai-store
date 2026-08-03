import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-white mb-4">🎮 Pi Match-3</h1>
        <p className="text-xl text-purple-200 mb-8">
          Play an exciting Candy Crush-style game and earn Pi rewards!
        </p>
        <Button
          onClick={() => navigate("/game")}
          className="bg-yellow-400 hover:bg-yellow-500 text-purple-900 font-bold text-lg px-8 py-6"
        >
          Start Playing
        </Button>
      </div>
    </div>
  );
}
