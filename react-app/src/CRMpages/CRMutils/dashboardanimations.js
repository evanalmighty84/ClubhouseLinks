import React from "react";
import Logo from "./img/img.png";

const VideoOverlay = () => {
    const handleSound = () => {
        const video = document.getElementById("videobgframe-1363381629");
        if (video) {
            video.muted = false;
        }
    };

    return (
        <div id="video-container" style={{ position: "relative", overflow: "hidden", marginTop:"30px" }}>
            {/* Overlay */}
            <div
                className="video-overlay"
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0, 0, 0, 0.0)", // Changed opacity to 0.0
                    zIndex: 1,
                }}
            ></div>

            {/* Custom Button */}
            <button
                onClick={handleSound}
                style={{
                    position: "absolute",
                    bottom: "10px",
                    left: "10px",
                    zIndex: 3,
                    padding: "8px 12px",
                    backgroundColor: "rgb(255, 112, 67)", // Updated background color
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "1rem",
                }}
                className="sound-button"
            >
                Turn Sound Up for Instructions
            </button>

            <style>{`
        @media (max-width: 768px) {
          .sound-button {
            padding: 6px 10px;
            font-size: 0.9rem;
          }
        }

        @media (max-width: 480px) {
          .sound-button {
            padding: 4px 8px;
            font-size: 0.7rem;
          }
        }
      `}</style>

            {/* Video */}
            <video
                autoPlay
                playsInline
                muted
                loop
                className="videobgframe"
                poster="./droneposter.jpeg"
                src="https://res.cloudinary.com/duz4vhtcn/video/upload/f_auto:video,q_auto/v1735896124/123appsfinished-invideo-ai-1080_Boost_Your_Email_Campaigns_with_A.I._Mag_2024-12-29_1_online-video-cutter.com_2_nx1eqt.mp4"
                style={{
                    objectFit: "cover",
                    width: "100%",
                    height: "100%",
                    zIndex: 0,
                }}
                id="videobgframe-1363381629"
            ></video>
        </div>
    );
};

export default VideoOverlay;
