import React, { useState, useEffect } from "react";
import { Toast, Button } from "react-bootstrap";
import CreateWorkflowForm from "../CRMcomponents/CreateWorkflowForm";
import TemplateCreate from "../CRMcomponents/TemplateCreate";
import CampaignCreate from "../CRMpages/CampaignCreate2";
import axios from "axios";

const API_BASE = 'https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api';



const WorkflowContainer = () => {
    const [templates, setTemplates] = useState([]);

    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedInterval, setSelectedInterval] = useState(0);

    const [showTemplateCreate, setShowTemplateCreate] = useState(false);
    const [showToast, setShowToast] = useState(false);

    const [campaigns, setCampaigns] = useState([]);
    const [userLists, setUserLists] = useState([]);

    const [aiResponse, setAiResponse] = useState("");
    const [selectedIndustry, setSelectedIndustry] = useState(null);

    const [industrySelectionMode, setIndustrySelectionMode] = useState(false);
    const [userIndustries, setUserIndustries] = useState([]);

    // ---------------------------------------------------
    // FETCH CAMPAIGN + LIST DATA
    // ---------------------------------------------------
    const fetchCampaigns = async () => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user?.id) {
            try {
                const response = await axios.get(`${API_BASE}/campaigns/user/${user.id}`);
                const sorted = response.data.sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at)
                );
                setCampaigns(sorted);

                const listResponse = await axios.get(`${API_BASE}/lists/user/${user.id}`);
                setUserLists(listResponse.data);
            } catch (error) {
                console.error("Error loading campaigns:", error);
            }
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    // ---------------------------------------------------
    // RESET WHEN CATEGORY CHANGES
    // ---------------------------------------------------
    const fullyResetEditor = () => {
        setShowTemplateCreate(false);
        setAiResponse("");
        setSelectedIndustry(null);
        setIndustrySelectionMode(false);
    };

    // This is called by CreateWorkflowForm whenever the dropdown changes
    const onContinueToTemplate = (payload) => {
        if (payload?.resetOnly) {
            // dropdown changed → reset everything
            fullyResetEditor();
            return;
        }

        // User clicked Continue to Template Design
        if (!payload.name) {
            setShowToast(true);
            return;
        }

        setSelectedCategory(payload.name);
        setSelectedInterval(payload.activity || 0);
        setShowTemplateCreate(true);
    };

    // ---------------------------------------------------
    // AI REQUEST
    // ---------------------------------------------------
    const onRequestAiDesign = async (workflowType) => {
        if (!workflowType) return;

        fullyResetEditor();
        setSelectedCategory(workflowType);

        const user = JSON.parse(localStorage.getItem("user"));

        try {
            const res = await axios.get(`${API_BASE}/users/${user.id}/industries`);
            const industries =
                res.data?.userIndustriesArrayNormalized ||
                res.data?.userIndustriesArrayRaw ||
                [];

            setUserIndustries(industries);

            if (industries.length === 1) {
                generateAiEmail(workflowType, industries[0]);
            } else {
                setIndustrySelectionMode(true);
            }
        } catch (err) {
            console.error("Failed to load user industries:", err);
        }
    };

    // ---------------------------------------------------
    // RUN AI GENERATOR
    // ---------------------------------------------------
    const generateAiEmail = async (workflowType, industry) => {
        setSelectedIndustry(industry);

        try {
            const user = JSON.parse(localStorage.getItem("user"));
            const logoUrl = user?.cloudinary_logo_url || "";

            const res = await axios.post(
                `${API_BASE}/aiGeneratedCampaignsAndTemplates/create`,
                {
                    type: workflowType,
                    industry,
                    logoUrl,
                }
            );

            setAiResponse(res.data.aiResponse || "");
            setShowTemplateCreate(true);
            setIndustrySelectionMode(false);
        } catch (err) {
            console.error("AI generation failed:", err);
        }
    };

    // ---------------------------------------------------
    // RENDER
    // ---------------------------------------------------
    return (
        <div className="container py-5 pt-0 pb-0">
            {/* INDUSTRY SELECTION (AI MULTI-INDUSTRY MODE) */}
            {industrySelectionMode && userIndustries.length > 1 && (
                <div className="p-4 mb-4" style={{ background: "#eef7ff", borderRadius: 8 }}>
                    <h4>Select Your Industry</h4>
                    <p>Select which industry the AI should design this email for:</p>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {userIndustries.map((ind) => (
                            <span
                                key={ind}
                                className="badge bg-primary"
                                style={{ padding: "10px", cursor: "pointer", fontSize: "1rem" }}
                                onClick={() => generateAiEmail(selectedCategory, ind)}
                            >
                                {ind}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* MAIN FORM */}
            <CreateWorkflowForm
                templates={templates}
                onCreateWorkflow={() => {}} // no longer used
                onRequestAiDesign={onRequestAiDesign}
                onContinueToTemplate={onContinueToTemplate}
                editorComponent={
                    showTemplateCreate ? (
                        selectedCategory === "Sale" || selectedCategory === "Advertisement" ? (
                            <CampaignCreate
                                aiResponse={aiResponse}
                                selectedIndustry={selectedIndustry}
                                campaigns={campaigns}
                                selectedCategory={selectedCategory}
                            />
                        ) : (
                            <TemplateCreate
                                aiResponse={aiResponse}
                                selectedIndustry={selectedIndustry}
                                selectedInterval={selectedInterval}
                                selectedCategory={selectedCategory}
                            />
                        )
                    ) : null
                }
            />

            {/* START OVER */}

            {/* WARNING */}
            <Toast
                onClose={() => setShowToast(false)}
                show={showToast}
                delay={2500}
                autohide
                style={{ position: "fixed", top: 20, right: 20, zIndex: 1000 }}
            >
                <Toast.Header>
                    <strong className="mr-auto">Warning</strong>
                </Toast.Header>
                <Toast.Body>Please select a Workflow Category before continuing.</Toast.Body>
            </Toast>
        </div>
    );
};

export default WorkflowContainer;
