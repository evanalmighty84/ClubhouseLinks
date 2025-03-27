import React from 'react';

const UnsubscribePage = () => {
    console.log('here is the unsubscribe  page!')
    const containerStyle = {
        margin: 0,
        padding: 0,
        fontFamily: "'Arial', sans-serif",
        background: "linear-gradient(to bottom right, #f7e0c4, brown)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        animation: "gradientChange 20s infinite",
        backgroundSize: "200% 200%"
    };

    const headerStyle = {
        fontSize: "2.5rem",
        textAlign: "center",
        color: "white",
        textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)"
    };

    const paragraphStyle = {
        fontSize: "1.2rem",
        textAlign: "center",
        margin: "10px 0",
        color: "white"
    };

    const buttonStyle = {
        display: "inline-block",
        marginTop: "20px",
        padding: "12px 24px",
        fontSize: "1.2rem",
        color: "white",
        backgroundColor: "#de4e7f",
        textDecoration: "none",
        borderRadius: "8px",
        fontWeight: "bold",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
        transition: "transform 0.3s, background-color 0.3s"
    };

    const buttonHoverStyle = {
        backgroundColor: "#008B00",
        transform: "translateY(-3px)"
    };

    return (
        <div style={containerStyle}>
            <div>
                <h1 style={headerStyle}>Sorry to see you go </h1>
                <p style={paragraphStyle}>
                  You have successfully unsubscribed from receiving emails from us
                </p>
                <a
                    href="https://www.clubhouselinks.com/app/#/app/signin"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={buttonStyle}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = buttonHoverStyle.backgroundColor;
                        e.currentTarget.style.transform = buttonHoverStyle.transform;
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "#de4e7f";
                        e.currentTarget.style.transform = "translateY(0)";
                    }}
                >
                    Go to Clubhouse Links
                </a>
            </div>
        </div>
    );
};

export default UnsubscribePage;
