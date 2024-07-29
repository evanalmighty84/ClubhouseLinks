import React, { ReactElement, useState } from "react";
import {
    programmingSvgElement,
    reactSvgElement,
    codeReviewSvgElement,
    codeInsectionSvgElement,
    openSourceSvgElement,
    bugFixingSvgElement,
    versionControlSvgElement,
    codingSvgElement,
    freelancerSvgElement,
    webDeveloperSvgElement,
    javascriptFrameworkSvgElement,
    educationIllustration,
    professionalIllustration
} from "./svgelements";
import { Container, Row, Col, Button } from "react-bootstrap";
// @ts-ignore
import Typist from "react-typist"
import { Timeline } from "antd";
import QRCode from  "../../qrcodeforAutoShow.png"
import createImage from "../memphis-startup-with-flying-rocket-and-coins.gif"

import EducationCard from "./EducationCard";
import ProfessionalCard from "./ProfessionalCard";
import newTry from "../../newesttry.jpg";

const getRandomSvgElement = () => {
    const arrayOfSvgElements = [
        programmingSvgElement,
        reactSvgElement,
        codeReviewSvgElement,
        codeInsectionSvgElement,
        openSourceSvgElement,
        bugFixingSvgElement,
        versionControlSvgElement,
        codingSvgElement,
        freelancerSvgElement,
        webDeveloperSvgElement,
        javascriptFrameworkSvgElement
    ];
    let index = Math.ceil(Math.random() * (10 - 0) + 0);
    console.log("Random: " + index);
    return arrayOfSvgElements[index];
};

const data = {
    name: "Evan Ligon",
    age: 38,
    currentLocation: "Plano, Texas",
    status: "Eat! Sleep! Thank God! Enjoy! Repeat! 🔁",
    passion: "Software Development, Coaching"
};

const ContactPage = () => {
    const [ideVisible, setIdeVisible] = useState(true);

    return (
        <div style={{backgroundColor:'white'}} className="aboutPage">
            <section id="educationalBackground">
                <Row>
                    <Col lg={6} xs={12} sm={12}>
                        <div className="sectionHeadingContainer">
                            <img style={{paddingTop:'1em'}}
                                 className="myImage"
                                 src={createImage}
                                 alt="Evan Ligon"
                            />
                            <span className="sectionHeadingText">Educational Background</span>
                        </div>
                        <div className="eduSectionContainer">
                            <Timeline>
                                <div    style={{ paddingBottom: "50px" }}>
                  <span className="eduCardTitle">
                    University of West Georgia




                  </span>
                                    <br />
                                    <span className="eduCardSubtitle">
                      Completed 3 years of Undergraduate curriculum before leaving.
            Never went back to finish my bachelors degree but instead became a self made software-engineer
                  </span>
                                    <br />
                                    <span className="eduCardText">GPA 3.5</span>
                                    <br />
                                    <span className="eduCardText">Timespan: 2005</span>
                                    <br />
                                </div>
                                <div style={{ paddingBottom: "50px" }}>
                                    <span className="eduCardTitle">Priority Male Institute </span>
                                    <br />
                                    <span className="eduCardSubtitle">
                   Vocational school for Information Technology
                  </span>
                                    <br />
                                    <span className="eduCardText">Percentage: 90%</span>
                                    <br />
                                    <span className="eduCardText">Timespan: 2008</span>
                                    <br />
                                </div>
                                <div style={{ paddingBottom: "50px" }}>
                                    <span className="eduCardTitle">Certified Microsoft Training </span>
                                    <br />
                                    <span className="eduCardSubtitle">
                    – JavaScript CSS3 and HTML5 (70-480)
                  </span>
                                    <br />
                                    <span className="eduCardText">Percentage: 90%</span>
                                    <br />
                                    <span className="eduCardText">Timespan: 2012</span>
                                    <br />
                                </div>
                                <div style={{ paddingBottom: "50px" }}>
                                    <span className="eduCardTitle">High School</span>
                                    <br />
                                    <span className="eduCardSubtitle">
                    - St.Francis High School
                  </span>
                                    <br />
                                    <span className="eduCardText">Timespan: 2000-2002</span>
                                    <br />
                                </div>
                            </Timeline>
                        </div>
                    </Col>

                    <Col className="eduBackColumn" lg={6} xs={12} sm={12}>
                        <div className="educationIllustration">{educationIllustration}</div>
                    </Col>
                </Row>
                <Row>
                    <Col lg={6} xs={12} sm={12}>
                        <div className="sectionHeadingContainer">
                            <img style={{paddingTop:'1em'}}
                                 className="myImage"
                                 src={newTry}
                                 alt="Evan Ligon"
                            />
                            <span className="sectionHeadingText">Educational Background</span>
                        </div>
                        <div className="eduSectionContainer">
                            <Timeline>
                                <div    style={{ paddingBottom: "50px" }}>
                  <span className="eduCardTitle">
                    University of West Georgia




                  </span>
                                    <br />
                                    <span className="eduCardSubtitle">
                      Completed 3 years of Undergraduate curriculum before leaving.
            Never went back to finish my bachelors degree but instead became a self made software-engineer
                  </span>
                                    <br />
                                    <span className="eduCardText">GPA 3.5</span>
                                    <br />
                                    <span className="eduCardText">Timespan: 2005</span>
                                    <br />
                                </div>
                                <div style={{ paddingBottom: "50px" }}>
                                    <span className="eduCardTitle">Priority Male Institute </span>
                                    <br />
                                    <span className="eduCardSubtitle">
                   Vocational school for Information Technology
                  </span>
                                    <br />
                                    <span className="eduCardText">Percentage: 90%</span>
                                    <br />
                                    <span className="eduCardText">Timespan: 2008</span>
                                    <br />
                                </div>
                                <div style={{ paddingBottom: "50px" }}>
                                    <span className="eduCardTitle">Certified Microsoft Training </span>
                                    <br />
                                    <span className="eduCardSubtitle">
                    – JavaScript CSS3 and HTML5 (70-480)
                  </span>
                                    <br />
                                    <span className="eduCardText">Percentage: 90%</span>
                                    <br />
                                    <span className="eduCardText">Timespan: 2012</span>
                                    <br />
                                </div>
                                <div style={{ paddingBottom: "50px" }}>
                                    <span className="eduCardTitle">High School</span>
                                    <br />
                                    <span className="eduCardSubtitle">
                    - St.Francis High School
                  </span>
                                    <br />
                                    <span className="eduCardText">Timespan: 2000-2002</span>
                                    <br />
                                </div>
                            </Timeline>
                        </div>
                    </Col>

                    <Col className="eduBackColumn" lg={6} xs={12} sm={12}>
                        <div className="educationIllustration">{educationIllustration}</div>
                    </Col>
                </Row>
            </section>
            <section id="professionalExperience">
                <Row>
                    <Col className="proColumn" lg={6} xs={12} sm={12}>

                    </Col>
                    <Col lg={6} xs={12} sm={12}>
                        <div className="sectionHeadingContainer">
                            <span className="sectionHeadingText">Experience</span>
                        </div>
                        <div className="eduSectionContainer">
                            <div style={{ paddingBottom: "50px" }}>
                <span className="eduCardTitle">
                  Lead Full Stack Developer
                </span>
                                <br />
                                <span className="eduCardSubtitle">
                 - Winnovative Apps/ Toyota Connected
                </span>
                                <br />
                                <span className="eduCardText">
                  <ul>
                    <li> Developer or AI Application seen here <img style={{height:"2.5vw", width:"2.5vw"}} className="svgTechIcon" src={QRCode}/></li>
<li>	Worked with the Lexus corporation on creating an email service and frontend UI to showcase their brand and vehicles.</li>
<li>	Lead Developer for an enterprise level react based Earth Day awareness initiative</li>
<li>	Created Architecture for entire projects</li>
<li>Maintained, housed and hosted projects with AWS EKS and S3 for CICD pipeline</li>
                    </ul>
</span>
                                <br />
                                <span className="eduCardText">Timespan: February 2023 - April 2023</span>
                                <br />
                            </div>
                            <div style={{ paddingBottom: "50px" }}>
                <span className="eduCardTitle">
                  Lead Front-End Developer
                </span>
                                <br />
                                <span className="eduCardSubtitle">
                 - Winnovative Apps/Propelled Brands
                </span>
                                <br />
                                <span className="eduCardText">
                                    <ul>
                    <li> Worked with and created a Google Authentication and React Context application</li>
<li>Worked on with API’s to create a CMS system for internal users</li>
<li>Led a team of over 10 to produce new products for enterprise level clients</li>
<li>Worked with firestore no sql db to create user permissions and persist data throughout application. </li>
                    </ul>
                </span>
                                <br />
                                <span className="eduCardText">Timespan: October 2022 - December 2022</span>
                                <br />
                            </div>

                            <div style={{ paddingBottom: "50px" }}>
                <span className="eduCardTitle">
                  Senior Software Developer
                </span>
                                <br />
                                <span className="eduCardSubtitle">
                 - Fairway Mortgage
                </span>
                                <br />
                                <span className="eduCardText">
                                    <ul>
                    <li> Worked with React Native to leverage mobile integration with existing backend framework</li>
<li>Used modern typescript principles (es6)</li>
<li>Worked in Agile team to created data driven client facing scalable website for consumers</li>
<li>Completed code reviews for Senior React Developers</li>
                    </ul>
                </span>
                                <br />
                                <span className="eduCardText">Timespan: Feb 2021 - August 2021</span>
                                <br />
                            </div>

                            <Timeline.Item style={{ paddingBottom: "50px" }}>
                <span className="eduCardTitle">
                  Senior Software Developer
                </span>
                                <br />
                                <span className="eduCardSubtitle">
                 - Toyota Motor Group North America
                </span>
                                <br />
                                <span className="eduCardText">
                                    <ul>
                    <li>Created data rich code with Adobe Experience Manager </li>
                  <li>Used modern typescript principles (es6)</li>
                  <li>Worked in Agile team to created data driven client facing scalable website for consumers</li>
                  <li>Completed code reviews for Senior React Developers</li>
                    </ul>
                </span>
                                <br />
                                <span className="eduCardText">Timespan: July 2020 - October 2020</span>
                                <br />
                            </Timeline.Item>
                        </div>
                    </Col>
                </Row>
            </section>
        </div>
    );
};

export default ContactPage;
