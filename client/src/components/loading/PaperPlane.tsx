import { Player } from "@lottiefiles/react-lottie-player";
import animationData from "@/assets/animations/paperplane-loading.json";

const PaperPlane = ({ fullScreen = false }: { fullScreen?: boolean }) => {
  return (
    <div
      className={`${
        fullScreen
          ? "fixed inset-0 z-50 bg-white/80 flex items-center justify-center"
          : "flex items-center justify-center"
      }`}
    >
      <Player
        autoplay
        loop
        src={animationData}
        style={{ height: 150, width: 150 }}
      />
    </div>
  );
};

export default PaperPlane;
