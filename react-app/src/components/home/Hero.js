import React, {useEffect} from "react";
import { Container, Row, Col } from "react-bootstrap";
// @ts-ignore
import Typist from "react-typist";
import Technologies from "./technologies";
import HomeWebExample from "./homeWebExample"

// @ts-ignore
import newTry from "../../newesttry.jpg"

import "./home.css";

const heroSection = {
  marginTop: 20,
  marginLeft: 20,
  color: "white",
};

const rowStyle = {
  color: "white",
  backgroundColor: "blue"
};

const photoSection = {
  marginTop: 40
};

const Hero = () => {



  return (
      <div style={heroSection}>


        <Container style={{paddingLeft:'0px'}}>
          <Row className="heroRow">
            <Col data-aos="fade-right" lg={6} xs={12} sm={6}>
              <div className="photoSection">
                <img
                    className="myImage"
                    src={newTry}
                    alt="Evan Ligon"
                />
              </div>

            </Col>

            <Col
                data-aos="fade-left"
                lg={6}
                xs={12}
                sm={6}
                className="nameColumn"
            >

              <a
                  href="tel:2145565210"
                  style={{
                    color: "white", // Text color
                    textDecoration: "none", // Remove underline for the link
                    textAlign: "center",
                    display: "block", // Center-align the text
                    textShadow: `
            0 0 10px rgba(255, 140, 0, 1), 
            0 0 20px rgba(255, 69, 0, 1), 
            0 0 30px rgba(255, 99, 71, 1), 
            0 0 40px rgba(255, 99, 71, 1)`
                  }}
              >
                <h1 style={{ margin: 0 }}>
                  214-556-5210
                </h1>
              </a>
              <style>
                {`
    @keyframes glowing {
        0%, 100% {
            text-shadow: 
                0 0 10px rgba(255, 140, 0, 1), 
                0 0 20px rgba(255, 69, 0, 1), 
                0 0 30px rgba(255, 99, 71, 1), 
                0 0 40px rgba(255, 99, 71, 1);
        }
        50% {
            text-shadow: 
                0 0 20px rgba(255, 99, 71, 1), 
                0 0 30px rgba(255, 69, 0, 1), 
                0 0 40px rgba(255, 140, 0, 1), 
                0 0 50px rgba(255, 69, 0, 1);
        }
    }
`}
              </style>


              <p style={{textIndent:'none'}}>Helping people with Websites and Applications for their businesses with a personal touch</p>
              <Typist
                  cursor={{ hideWhenDone: true }}
                  avgTypingDelay={30}
                  stdTypingDelay={20}
              >
                <span className="nameText">Evan Ligon </span>
                <br /><br />
                <Typist.Delay ms={500} />
                <span className="descriptionText"> Entrepreneur</span>
                <Typist.Backspace count={12} delay={300} />
                <span className="descriptionText"> Software Developer</span>
                <Typist.Backspace count={18} delay={300} />
                <span className="descriptionText">Web Developer</span>
                <Typist.Backspace count={13} delay={300} />
                <span className="descriptionText">Marketer</span>
                <Typist.Backspace count={13} delay={300} />
                <span className="descriptionText">Mentor</span>
                <Typist.Backspace count={6} delay={300} />
                <span className="descriptionText">Fullstack experience</span>
                <Typist.Backspace count={20} delay={300} />
                <span className="descriptionText">Mobile App Development</span>
                <Typist.Backspace count={22} delay={300} />
                <span className="descriptionText">Machine Learning</span>
                <Typist.Backspace count={16} delay={300} />
                <span className="descriptionText">Father</span>
                <Typist.Backspace count={16} delay={300} />
                <span className="descriptionText">Husband</span>
                <Typist.Backspace count={7} delay={300} />
                <span className="descriptionText">Evan Ligon</span>
              </Typist>
              <hr style={{backgroundColor:'black', color:'black'}}/>
            <span className="helloText">
              Hello &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; नमस्ते
              &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; Hola
              &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; 你好
              &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; مرحبا
              &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; salut &nbsp; 👋
            </span>
              <br /><br />


              <div className="socialHandleSection" style={{backgroundColor:'steelblue',padding:'.5em'}}>
                <a href="https://www.facebook.com/profile.php?id=100075825412940">
                  <img
                      className="socialHandleIcon"
                      src="https://user-images.githubusercontent.com/45563022/90330017-48bc3000-dfc7-11ea-8171-bdac7c7f2ba3.png"
                  />
                </a>
                <a href="https://github.com/evanalmighty84">
                  <img
                      className="socialHandleIcon"
                      src="https://user-images.githubusercontent.com/45563022/90330053-89b44480-dfc7-11ea-8f97-b0f1f45761bd.png"
                  />
                </a>
                <a href="https://twitter.com/WinnovativeApps">
                  <img
                      className="socialHandleIcon"
                      src="https://user-images.githubusercontent.com/45563022/90330082-cbdd8600-dfc7-11ea-998d-d3ebfeb3728c.png"
                  />
                </a>
                <a href="./Hero">
                  <img
                      className="socialHandleIcon"
                      src="https://user-images.githubusercontent.com/45563022/90330101-edd70880-dfc7-11ea-9a1b-ed15bd2b52f4.png"
                  />
                </a>
                <a href="https://medium.com/@evanligon7">
                  <img
                      className="socialHandleIcon"
                      src="https://user-images.githubusercontent.com/45563022/90330143-1bbc4d00-dfc8-11ea-8aab-39f0e04f7e91.png"
                  />
                </a>
                <a href="https://www.youtube.com/channel/UCauJLD3S5SyvVPYTnf6Mewg">
                  <img
                      className="socialHandleIcon"
                      src="https://user-images.githubusercontent.com/45563022/90330161-4d351880-dfc8-11ea-93a3-72f45d58dcdb.png"
                  />
                </a>
              </div>

            </Col>
          </Row>
        </Container>


        <HomeWebExample />


        <Typist
            cursor={{ hideWhenDone: true }}
            avgTypingDelay={30}
            stdTypingDelay={20}
        >
          <span className="nameText">Facebook Business Integration </span>
          <br /><br />
          <Typist.Delay ms={500} />
          <span className="descriptionText"> GitHub Portfolio</span>
          <Typist.Backspace count={16} delay={300} />
          <span className="descriptionText">Twitter Integration</span>
          <Typist.Backspace count={19} delay={300} />
          <span className="descriptionText">LinkedIn Advertising</span>
          <Typist.Backspace count={20} delay={300} />
          <span className="descriptionText">Medium Integration</span>
          <Typist.Backspace count={18} delay={300} />
          <span className="descriptionText">YouTube Channel Integration</span>
          <Typist.Backspace count={27} delay={300} />
          <span className="descriptionText">Facebook Business Integration</span>
        </Typist>
        <hr style={{backgroundColor:'black', color:'black'}}/>
        <Container className="scroller">
          <section id="technologiesSection">
            <a href="src/components/home/Hero.js">
              <span />
              <span />
              <span />
            </a>
          </section>
        </Container>

        <section id="techSection" style={{ width:'95%'}}>
          <Container style={{  borderWidth:'1em' }}>
            <Row data-aos="fade-left" className="technologies" style={{backgroundColor:'purple',border:'solid'}}>
              <Technologies
                  heading={"Programming Languages"}
                  techType={"programming"}
              />
            </Row>
            <Row data-aos="fade-left" className="technologies" style={{backgroundColor:'steelblue',border:'solid'}}>
              <Technologies heading={"Web Frameworks"} techType={"framework"} />
            </Row>
            <Row data-aos="fade-left" className="technologies" style={{backgroundColor:'cadetblue',border:'solid'}}>
              <Technologies
                  heading={"Mobile App Development"}
                  techType={"mobile"}
              />
            </Row>
            <Row data-aos="fade-left" className="technologies" style={{backgroundColor:'#ffc107',border:'solid'}}>
              <Technologies heading={"(CI/CD)/Backend"} techType={"misc"} />
            </Row>
          </Container>
        </section>

        <section id="socialMediaAtBottom">
          <span className="reachMeOutTxt">Reach me out</span><br /><br />
          <a href="src/components/home/Hero.js">
            <img
                className="socialHandleIconBottom"
                src="https://user-images.githubusercontent.com/45563022/90330017-48bc3000-dfc7-11ea-8171-bdac7c7f2ba3.png"
            />
          </a>
          <a href="https://github.com/ritesh-sharma33">
            <img
                className="socialHandleIconBottom"
                src="https://user-images.githubusercontent.com/45563022/90330053-89b44480-dfc7-11ea-8f97-b0f1f45761bd.png"
            />
          </a>
          <a href="https://twitter.com/WinnovativeApps">
            <img
                className="socialHandleIconBottom"
                src="https://user-images.githubusercontent.com/45563022/90330082-cbdd8600-dfc7-11ea-998d-d3ebfeb3728c.png"
            />
          </a>
          <a href="./Hero">
            <img
                className="socialHandleIconBottom"
                src="https://user-images.githubusercontent.com/45563022/90330101-edd70880-dfc7-11ea-9a1b-ed15bd2b52f4.png"
            />
          </a>
          <a href="https://medium.com/@evanligon7">
            <img
                className="socialHandleIconBottom"
                src="https://user-images.githubusercontent.com/45563022/90330143-1bbc4d00-dfc8-11ea-8aab-39f0e04f7e91.png"
            />
          </a>
          <a href="https://www.youtube.com/channel/UCauJLD3S5SyvVPYTnf6Mewg">
            <img
                className="socialHandleIconBottom"
                src="https://user-images.githubusercontent.com/45563022/90330161-4d351880-dfc8-11ea-93a3-72f45d58dcdb.png"
            />
          </a>
        </section>
      </div>
  );
};

export default Hero;
