import React, { useState, useEffect } from 'react';
import { Form, Button, Tabs, Tab, Col } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../CRMstyles/TemplateCreate.css';
import animationData from './Animation - 1741235903291.json';
import Lottie from 'lottie-react';

const TemplateCreate = ({ selectedCategory, selectedInterval, aiResponse, selectedIndustry }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("details");
    const [showAnimation, setShowAnimation] = useState(true);

    const placeholderImage =
        "https://res.cloudinary.com/duz4vhtcn/image/upload/v1741238955/58485771a6aca45b5a5c95b8_zmvivg.png";

    const [imageLoaded, setImageLoaded] = useState(false);

    const [customContent, setCustomContent] = useState({
        header: "",
        images: [{ url: "" }],
        pitch: "",
        emailBodies: [""],
        reviewLinks: [{ url: "" }],
        placeholders: {},
        logo: "",
        contactInfo: "",
        contactInfo2: "",
        website: ""
    });

    const [imageCount, setImageCount] = useState(1);
    const [bodyCount, setBodyCount] = useState(1);

    const [templateData, setTemplateData] = useState({
        category: selectedCategory,
        interval: selectedInterval,
        user_id: "",
        content: ""
    });

    useEffect(() => {
        const timer = setTimeout(() => setShowAnimation(false), 8000);
        return () => clearTimeout(timer);
    }, []);

    const handleImageLoad = () => setImageLoaded(true);

    // ---------------------------
    // USER ID LOADING
    // ---------------------------
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user) {
            setTemplateData((prev) => ({ ...prev, user_id: user.id }));
        }
    }, []);

    // ---------------------------
    // ADJUST FIELDS BASED ON CATEGORY
    // ---------------------------
    useEffect(() => {
        if (selectedCategory) {
            adjustFieldsForTemplate(selectedCategory);
        }
    }, [selectedCategory]);

    const adjustFieldsForTemplate = (category) => {
        let imagesNeeded = 1;
        let bodiesNeeded = 1;
        let reviewNeeded = 2;
        let placeholders = { header: "", pitch: "" };

        switch (category) {
            case "Advertisement":
                imagesNeeded = 3;
                bodiesNeeded = 3;
                placeholders = {
                    header: "Advertisement Header",
                    pitch: "Advertisement Pitch"
                };
                break;
            case "Sale":
                imagesNeeded = 1;
                bodiesNeeded = 1;
                placeholders = {
                    header: "Sale Header",
                    pitch: "Sale Pitch"
                };
                break;
            case "Thank you for your business":
                imagesNeeded = 1;
                bodiesNeeded = 1;
                reviewNeeded = 2;
                placeholders = {
                    header: "Thank You Header",
                    pitch: "Thank You Pitch"
                };
                break;
            case "Opened Email List":
                imagesNeeded = 3;
                bodiesNeeded = 4;
                placeholders = {
                    header: "Opened Email List Header",
                    pitch: "Opened Email List Pitch"
                };
                break;
            case "Opened Email Hot List":
                imagesNeeded = 3;
                bodiesNeeded = 4;
                placeholders = {
                    header: "Hot List Header",
                    pitch: "Hot List Pitch"
                };
                break;
            case "Top of Mind":
                imagesNeeded = 1;
                bodiesNeeded = 1;
                placeholders = {
                    header: "Top of Mind Header",
                    pitch: "Top of Mind Pitch"
                };
                break;
        }

        setImageCount(imagesNeeded);
        setBodyCount(bodiesNeeded);

        setCustomContent((prev) => ({
            ...prev,
            images: Array(imagesNeeded).fill({ url: "" }),
            emailBodies: Array(bodiesNeeded).fill(""),
            reviewLinks: Array(reviewNeeded).fill({ url: "" }),
            placeholders
        }));
    };

    // ---------------------------
    //  PREFILL FROM AI RESPONSE
    // ---------------------------
    useEffect(() => {
        if (!aiResponse) return;

        try {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = aiResponse;

            const header = tempDiv.querySelector("h1")?.innerText || "";
            const pitch = tempDiv.querySelector("p")?.innerText || "";

            const imgs = [...tempDiv.querySelectorAll("img")].map((i) => ({
                url: i.src
            }));

            const bodies = [...tempDiv.querySelectorAll("p")]
                .map((p) => p.innerText)
                .slice(1);

            setCustomContent((prev) => ({
                ...prev,
                header,
                pitch,
                images: imgs.length > 0 ? imgs : prev.images,
                emailBodies: bodies.length > 0 ? bodies : prev.emailBodies
            }));
        } catch (err) {
            console.error("AI Prefill parse error:", err);
        }
    }, [aiResponse]);

    // ---------------------------
    // FIELD CHANGE HANDLERS
    // ---------------------------
    const handleCustomContentChange = (field, value) => {
        setCustomContent((prev) => ({ ...prev, [field]: value }));
    };

    const handleBodyChange = (index, value) => {
        const updated = [...customContent.emailBodies];
        updated[index] = value;
        setCustomContent((prev) => ({ ...prev, emailBodies: updated }));
    };

    const handleImageUrlChange = (index, value) => {
        const updated = [...customContent.images];
        updated[index] = { url: value };
        setCustomContent((prev) => ({ ...prev, images: updated }));
    };

    const handleReviewUrlChange = (index, value) => {
        const updated = [...customContent.reviewLinks];
        updated[index] = { url: value };
        setCustomContent((prev) => ({ ...prev, reviewLinks: updated }));
    };

    // ---------------------------
    // HTML OUTPUT
    // ---------------------------
    const renderTemplateContent = () => {
        return aiResponse || `
            <div style="font-family: Arial; max-width:600px; margin:auto;">
              <h1>${customContent.header}</h1>
              <p>${customContent.pitch}</p>
            </div>
        `;
    };

    // ---------------------------
    // SAVE TEMPLATE
    // ---------------------------
    const handleSaveTemplate = async () => {
        const templateToSave = {
            category: selectedCategory,
            interval: selectedInterval,
            user_id: templateData.user_id,
            content: renderTemplateContent()
        };

        try {
            const res = await axios.post(
                "https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/templates/create",
                templateToSave
            );

            if (res.status === 200 || res.status === 201) {
                alert("Template saved successfully!");
                navigate("/dashboard");
            }
        } catch (err) {
            console.error("Error saving:", err);
            alert("Failed to save template.");
        }
    };

    // ---------------------------
    // RENDER
    // ---------------------------
    return (
        <div className="template-create-container p-4">
            <h3 style={{fontWeight:'lighter'}} className="text-center text-white">
                Edit Your {selectedCategory} Email
            </h3>

            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                {/* DETAILS TAB */}
                <Tab eventKey="details" title="Details">
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Logo (URL)</Form.Label>
                            <Form.Control
                                type="text"
                                value={customContent.logo}
                                onChange={(e) =>
                                    handleCustomContentChange("logo", e.target.value)
                                }
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Contact Info</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={customContent.contactInfo}
                                onChange={(e) =>
                                    handleCustomContentChange("contactInfo", e.target.value)
                                }
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Website</Form.Label>
                            <Form.Control
                                type="text"
                                value={customContent.website}
                                onChange={(e) =>
                                    handleCustomContentChange("website", e.target.value)
                                }
                            />
                        </Form.Group>

                        <Button variant="primary" onClick={() => setActiveTab("content")}>
                            Continue to Content
                        </Button>
                    </Form>
                </Tab>

                {/* CONTENT TAB */}
                <Tab eventKey="content" title="Content">
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>{customContent.placeholders.header}</Form.Label>
                            <Form.Control
                                type="text"
                                value={customContent.header}
                                onChange={(e) =>
                                    handleCustomContentChange("header", e.target.value)
                                }
                            />
                        </Form.Group>

                        {customContent.emailBodies.map((body, i) => (
                            <Form.Group key={i} className="mb-3">
                                <Form.Label>Email Body {i + 1}</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    value={body}
                                    onChange={(e) => handleBodyChange(i, e.target.value)}
                                />
                            </Form.Group>
                        ))}

                        <Button
                            className="mt-2"
                            variant="success"
                            onClick={handleSaveTemplate}
                        >
                            Save Template
                        </Button>
                    </Form>
                </Tab>
            </Tabs>

            {/* RIGHT SIDE PREVIEW */}
            <Col md={6}>
                <div className="email-preview mt-3">
                    <div
                        style={{
                            background: "white",
                            padding: 20,
                            borderRadius: 8,
                            overflow: "auto"
                        }}
                        dangerouslySetInnerHTML={{
                            __html: aiResponse || renderTemplateContent()
                        }}
                    />
                </div>
            </Col>
        </div>
    );
};

export default TemplateCreate;
