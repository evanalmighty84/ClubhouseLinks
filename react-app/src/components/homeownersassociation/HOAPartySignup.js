import React, { useEffect, useMemo, useState } from "react";
import hoaPicture from "../../components/HOANewPicture.png";
import logo from "../../components/Untitled_design_7_o9dfvi_c_crop,w_1116,h_628,ar_16_9.png";
import "./HOAPartySignup.css";

const API_BASE =
    process.env.REACT_APP_API_BASE_URL ||
    "https://crm-function-app-5d4de511071d.herokuapp.com";

const HOA_URL = `${API_BASE}/server/lead_function/api/hoa`;

const RESIDENT_SIGNUP_URL =
    `${API_BASE}/server/resident_function/api/residents/signup`;

const fallbackParties = [
    {
        id: 1,
        city: "Plano",
        state: "Texas",
        neighborhood: "Country Place fallback",
        address: "3600 Country Place Dr, Plano, TX, United States, Texas",
        weekend: "June 13th and 14th",
        time: "12:00 PM - 3:00 PM",
    },
];

const industries = [
    "christmas_lights",
    "electrician",
    "fencing",
    "garage",
    "general_contractor",
    "generator",
    "golf_instructor",
    "handyman",
    "house_cleaner",
    "hvac",
    "interior_designer",
    "junk_removal",
    "landscaping",
    "lawn_care",
    "lighting",
    "outdoor_cleaning",
    "other",
    "painter",
    "pest_control",
    "pet_sitter",
    "plumber",
    "pool",
    "realtor",
    "roofer",
    "security",
    "tech",
    "wellness",
    "windows",
];

const HOAPartySignup = () => {
    console.log("API_BASE =", API_BASE);

    const [parties, setParties] = useState(fallbackParties);
    const [selectedPartyId, setSelectedPartyId] = useState(String(fallbackParties[0].id));
    const [loadingParties, setLoadingParties] = useState(false);
    const [showAppCountdown, setShowAppCountdown] = useState(false);

    const [earlyAccessForm, setEarlyAccessForm] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        address: "",
        neighborhoodCode: "COUNTRYPLACE2026",
    });

    const [earlyAccessSaving, setEarlyAccessSaving] = useState(false);

    const [providerForm, setProviderForm] = useState({
        businessName: "",
        contactName: "",
        email: "",
        phone: "",
        serviceCategory: "",
    });

    const [providerSaving, setProviderSaving] = useState(false);
    const [providerSaved, setProviderSaved] = useState(false);
    const [stripeClientReferenceId, setStripeClientReferenceId] = useState("");

    const selectedParty =
        parties.find((party) => String(party.id) === String(selectedPartyId)) ||
        parties[0];

    const handleAppStoreClick = async () => {
        setShowAppCountdown(true);

        try {
            await fetch(`${HOA_URL}/app-store-click`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hoa_party_id: selectedParty?.id,
                    source: "hoa_page_app_store_button",
                }),
            });
        } catch (error) {
            console.error("App Store click tracking failed:", error);
        }
    };

    useEffect(() => {
        const fetchParties = async () => {
            try {
                setLoadingParties(true);

                const response = await fetch(`${HOA_URL}/parties`);

                if (!response.ok) {
                    throw new Error("Failed to fetch HOA parties");
                }

                const data = await response.json();

                if (Array.isArray(data) && data.length > 0) {
                    setParties(data);
                    setSelectedPartyId(String(data[0].id));
                }
            } catch (error) {
                console.error("Using fallback HOA party data:", error);
            } finally {
                setLoadingParties(false);
            }
        };

        fetchParties();
    }, []);

    const handleEarlyAccessChange = (e) => {
        setEarlyAccessForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleEarlyAccessSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            first_name: earlyAccessForm.firstName,
            last_name: earlyAccessForm.lastName,
            phone: earlyAccessForm.phone,
            address: earlyAccessForm.address,
            invite_code: earlyAccessForm.neighborhoodCode
                .toUpperCase()
                .trim(),
        };

        try {
            setEarlyAccessSaving(true);

            const response = await fetch(RESIDENT_SIGNUP_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Signup failed.");
            }

            alert("Thank you! You have been added for first access to the Clubhouse Resident app.");

            setEarlyAccessForm({
                firstName: "",
                lastName: "",
                phone: "",
                address: "",
                neighborhoodCode: "COUNTRYPLACE2026",
            });
        } catch (error) {
            console.error("Resident early access signup failed:", error);
            alert(error.message || "Could not save your signup. Please try again.");
        } finally {
            setEarlyAccessSaving(false);
        }
    };

    const handleProviderChange = (e) => {
        setProviderForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));

        setProviderSaved(false);
        setStripeClientReferenceId("");
    };

    const handlePartyFilterChange = (e) => {
        setSelectedPartyId(e.target.value);
        setProviderSaved(false);
        setStripeClientReferenceId("");
    };

    const handleProviderSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            hoa_party_id: selectedParty.id,
            business_name: providerForm.businessName,
            contact_name: providerForm.contactName,
            email: providerForm.email,
            phone: providerForm.phone,
            service_category: providerForm.serviceCategory,
        };

        try {
            setProviderSaving(true);

            const response = await fetch(`${HOA_URL}/provider-signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Provider signup failed");
            }

            const data = await response.json();

            if (!data?.id) {
                throw new Error("Provider signup saved but no ID was returned");
            }

            setStripeClientReferenceId(
                data.stripe_client_reference_id || `hoa_provider_${data.id}`
            );

            setProviderSaved(true);
        } catch (error) {
            console.error("Provider signup failed:", error);
            alert("Could not save your provider signup. Please try again.");
        } finally {
            setProviderSaving(false);
        }
    };

    const handleProviderCheckout = async () => {
        try {
            setProviderSaving(true);

            const payload = {
                hoa_party_id: selectedParty.id,
                business_name: providerForm.businessName,
                contact_name: providerForm.contactName,
                email: providerForm.email,
                phone: providerForm.phone,
                service_category: providerForm.serviceCategory,
            };

            const saveRes = await fetch(`${HOA_URL}/provider-signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const savedProvider = await saveRes.json();

            const checkoutRes = await fetch(`${HOA_URL}/create-provider-checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    signup_id: savedProvider.id,
                    stripe_client_reference_id: savedProvider.stripe_client_reference_id,
                    price_id: "price_1Tc9ekLVTbVnCRoaAY4LwiBs",
                }),
            });

            const checkoutData = await checkoutRes.json();

            if (!checkoutData.url) throw new Error("No Stripe Checkout URL returned");

            window.location.href = checkoutData.url;
        } catch (err) {
            console.error("Checkout error:", err);
            alert("Something went wrong starting checkout.");
        } finally {
            setProviderSaving(false);
        }
    };

    const sortedParties = useMemo(() => {
        return [...parties].sort((a, b) => {
            const aDate = new Date(a.event_date || a.date || a.created_at || 0).getTime();
            const bDate = new Date(b.event_date || b.date || b.created_at || 0).getTime();
            return bDate - aDate;
        });
    }, [parties]);

    const providerFormComplete =
        providerForm.businessName &&
        providerForm.contactName &&
        providerForm.email &&
        providerForm.phone &&
        providerForm.serviceCategory;

    return (
        <section className="hoa-page">
            <img
                src={logo}
                alt="Clubhouse Links"
                className="hoa-hero-logo"
            />

            <p className="hoa-kicker">
                {loadingParties ? "Loading Event..." : "HOA Community Event"}
            </p>
            <div className="hoa-hero">
                <img
                    src={hoaPicture}
                    alt="HOA community event"
                    className="hoa-hero-img"
                />

                <p className="hoa-event-description">
                    HOA community events create a unique opportunity for homeowners to meet trusted local service professionals face-to-face before ever needing a service. Whether it's a contractor, landscaper, pool company, painter, or other home service provider, these gatherings help build real relationships through personal interaction rather than advertisements or cold outreach. Homeowners gain access to vetted local businesses, while service providers have the chance to connect directly with the communities they serve. The result is stronger neighborhood relationships, greater trust, and a more connected local economy built on genuine conversations and referrals.
                </p>

                <div className="hoa-hero-overlay">
                    <button
                        type="button"
                        className="app-store-coming-button"
                        onClick={handleAppStoreClick}
                    >
                        <span className="app-store-icon"></span>
                        <span>
                            <small>Available on the</small>
                            App Store
                        </span>
                    </button>

                    {showAppCountdown && (
                        <div className="hero-early-access-box">
                            <p className="hero-early-access-title">
                                App Still In Review
                            </p>

                            <p className="hero-early-access-subtitle">
                                Sign up now for first access to the Clubhouse Resident app.
                            </p>

                            <form
                                onSubmit={handleEarlyAccessSubmit}
                                className="hero-early-access-form"
                            >
                                <input
                                    name="firstName"
                                    value={earlyAccessForm.firstName}
                                    onChange={handleEarlyAccessChange}
                                    placeholder="First name"
                                    required
                                />

                                <input
                                    name="lastName"
                                    value={earlyAccessForm.lastName}
                                    onChange={handleEarlyAccessChange}
                                    placeholder="Last name"
                                    required
                                />

                                <input
                                    name="phone"
                                    value={earlyAccessForm.phone}
                                    onChange={handleEarlyAccessChange}
                                    placeholder="Mobile phone"
                                    required
                                />

                                <input
                                    name="address"
                                    value={earlyAccessForm.address}
                                    onChange={handleEarlyAccessChange}
                                    placeholder="Address"
                                    required
                                />

                                <input
                                    name="neighborhoodCode"
                                    value={earlyAccessForm.neighborhoodCode}
                                    onChange={handleEarlyAccessChange}
                                    placeholder="COUNTRYPLACE2026"
                                    required
                                />

                                <button type="submit" disabled={earlyAccessSaving}>
                                    {earlyAccessSaving ? "Saving..." : "Get First Access"}
                                </button>
                            </form>
                        </div>
                    )}


                </div>
            </div>

            <div className="hoa-event-picker">
                <p className="hoa-card-kicker">See All Upcoming Events</p>

                <select value={selectedPartyId} onChange={handlePartyFilterChange}>
                    {sortedParties.map((party) => (
                        <option key={party.id} value={party.id}>
                            {party.city} • {party.neighborhood} • {party.weekend}
                        </option>
                    ))}
                </select>
            </div>

            <div className="hoa-selected-event-card">
                <h1 className="hoa-event-title">
                    {selectedParty.neighborhood} HOA EVENT
                </h1>

                <h3>Event Details</h3>

                <div className="hoa-event-detail-grid">
                    <p><strong>City:</strong> {selectedParty.city}</p>
                    <p><strong>State:</strong> {selectedParty.state}</p>
                    <p><strong>Neighborhood:</strong> {selectedParty.neighborhood}</p>
                    <p><strong>Address:</strong> {selectedParty.address}</p>
                    <p><strong>Date:</strong> {selectedParty.weekend}</p>
                    <p><strong>Time:</strong> {selectedParty.time}</p>
                </div>

                <p className="hoa-rain-note">
                    {selectedParty.rain_note || selectedParty.rainNote}
                </p>
            </div>

            <div className="hoa-signup-grid hoa-signup-grid-single">
                <form
                    className="hoa-form-card provider-card provider-card-full"
                    onSubmit={handleProviderSubmit}
                >
                    <div>
                        <p className="hoa-card-kicker">
                            Service Provider *Industry Exclusive
                        </p>

                        <h2>Reserve a Space</h2>

                        <label>Business Name</label>
                        <input
                            name="businessName"
                            value={providerForm.businessName}
                            onChange={handleProviderChange}
                            placeholder="Company name"
                            required
                        />

                        <label>Contact Name</label>
                        <input
                            name="contactName"
                            value={providerForm.contactName}
                            onChange={handleProviderChange}
                            placeholder="Main contact"
                            required
                        />

                        <label>Email</label>
                        <input
                            name="email"
                            type="email"
                            value={providerForm.email}
                            onChange={handleProviderChange}
                            placeholder="business@email.com"
                            required
                        />

                        <label>Phone</label>
                        <input
                            name="phone"
                            value={providerForm.phone}
                            onChange={handleProviderChange}
                            placeholder="Business phone"
                            required
                        />

                        <label>Service Category</label>
                        <select
                            name="serviceCategory"
                            value={providerForm.serviceCategory}
                            onChange={handleProviderChange}
                            required
                        >
                            <option value="">Choose a category</option>

                            {industries.map((industry) => (
                                <option key={industry} value={industry}>
                                    {industry.replaceAll("_", " ")}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="hoa-stripe-wrap">
                        <button
                            type="button"
                            className="stripe-button"
                            disabled={!providerFormComplete || providerSaving}
                            onClick={handleProviderCheckout}
                        >
                            {providerSaving ? "Saving..." : "Save Info & Continue"}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default HOAPartySignup;