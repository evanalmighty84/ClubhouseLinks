import React, { useEffect, useState } from "react";
import hoaPicture from "../../CRMpages/HOAPicture.png";
import "./HOAPartySignup.css";

const API_BASE =
    process.env.REACT_APP_API_BASE_URL ||
    "https://crm-function-app-5d4de511071d.herokuapp.com";

const HOA_URL = `${API_BASE}/server/lead_function/api/hoa`;

const fallbackParties = [
    {
        id: 1,
        city: "Plano",
        state: "Texas",
        neighborhood: "Country Place",
        address: "3600 Country Place Dr, Plano, TX, United States, Texas",
        weekend: "June 13th and 14th",
        rain_note: "If Saturday is raining we will do Sunday.",
        time: "12:00 PM - 3:00 PM",
    },
];

const industries = [
    "christmas_lights",
    "commercial_lending",
    "electrician",
    "fencing",
    "garage",
    "general_contractor",
    "generator",
    "golf_instructor",
    "handyman",
    "house_cleaner",
    "hvac",
    "interior designer",
    "interior_designer",
    "junk_removal",
    "landscaping",
    "lawn_care",
    "lawncare",
    "lighting",
    "painter",
    "pest_control",
    "pet_sitter",
    "plumber",
    "plumbing",
    "pool",
    "realtor",
    "roofer",
    "security",
    "tech",
    "windows",
];

const HOAPartySignup = () => {
    const [parties, setParties] = useState(fallbackParties);
    const [loadingParties, setLoadingParties] = useState(false);

    const [guestForm, setGuestForm] = useState({
        name: "",
        email: "",
        phone: "",
        attendees: "1",
    });

    const [providerForm, setProviderForm] = useState({
        businessName: "",
        contactName: "",
        email: "",
        phone: "",
        serviceCategory: "",
    });

    const [guestSaving, setGuestSaving] = useState(false);
    const [providerSaving, setProviderSaving] = useState(false);
    const [providerSaved, setProviderSaved] = useState(false);
    const [stripeClientReferenceId, setStripeClientReferenceId] = useState("");

    const selectedParty = parties[0];

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
                }
            } catch (error) {
                console.error("Using fallback HOA party data:", error);
            } finally {
                setLoadingParties(false);
            }
        };

        fetchParties();
    }, []);

    const handleGuestChange = (e) => {
        setGuestForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleProviderChange = (e) => {
        setProviderForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));

        setProviderSaved(false);
        setStripeClientReferenceId("");
    };

    const handleGuestSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            hoa_party_id: selectedParty.id,
            name: guestForm.name,
            email: guestForm.email,
            phone: guestForm.phone,
            attendees: Number(guestForm.attendees) || 1,
        };

        try {
            setGuestSaving(true);

            const response = await fetch(`${HOA_URL}/guest-signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Guest signup failed");
            }

            alert("Thanks! You have been added to the guest signup sheet.");

            setGuestForm({
                name: "",
                email: "",
                phone: "",
                attendees: "1",
            });
        } catch (error) {
            console.error("Guest RSVP failed:", error);
            alert("Could not save your RSVP. Please try again.");
        } finally {
            setGuestSaving(false);
        }
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

            console.log("Provider signup response:", data);

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

    const providerFormComplete =
        providerForm.businessName &&
        providerForm.contactName &&
        providerForm.email &&
        providerForm.phone &&
        providerForm.serviceCategory;

    return (
        <section className="hoa-page">
            <div className="hoa-hero">
                <img
                    src={hoaPicture}
                    alt="HOA community event"
                    className="hoa-hero-img"
                />

                <div className="hoa-hero-overlay">
                    <p className="hoa-kicker">
                        {loadingParties ? "Loading Event..." : "HOA Community Event"}
                    </p>

                    <h1>{selectedParty.neighborhood} Signup Sheet</h1>

                    <div className="hoa-event-details">
                        <p>
                            <strong>City:</strong> {selectedParty.city}
                        </p>

                        <p>
                            <strong>State:</strong> {selectedParty.state}
                        </p>

                        <p>
                            <strong>Neighborhood:</strong> {selectedParty.neighborhood}
                        </p>

                        <p>
                            <strong>Address:</strong> {selectedParty.address}
                        </p>

                        <p>
                            <strong>Weekend:</strong> {selectedParty.weekend}
                        </p>

                        <p>
                            <strong>Time:</strong> {selectedParty.time}
                        </p>

                        <p className="hoa-rain-note">
                            {selectedParty.rain_note || selectedParty.rainNote}
                        </p>
                    </div>
                </div>
            </div>

            <div className="hoa-signup-grid">
                <form className="hoa-form-card" onSubmit={handleGuestSubmit}>
                    <div>
                        <p className="hoa-card-kicker">Guest RSVP</p>

                        <h2>Attend the HOA Party</h2>

                        <label>Name</label>
                        <input
                            name="name"
                            value={guestForm.name}
                            onChange={handleGuestChange}
                            placeholder="Your name"
                            required
                        />

                        <label>Email</label>
                        <input
                            name="email"
                            type="email"
                            value={guestForm.email}
                            onChange={handleGuestChange}
                            placeholder="you@email.com"
                            required
                        />

                        <label>Phone</label>
                        <input
                            name="phone"
                            value={guestForm.phone}
                            onChange={handleGuestChange}
                            placeholder="Phone number"
                        />

                        <label>Number Attending</label>
                        <input
                            name="attendees"
                            type="number"
                            min="1"
                            value={guestForm.attendees}
                            onChange={handleGuestChange}
                        />
                    </div>

                    <button type="submit" disabled={guestSaving}>
                        {guestSaving ? "Saving..." : "RSVP"}
                    </button>
                </form>

                <form
                    className="hoa-form-card provider-card"
                    onSubmit={handleProviderSubmit}
                >
                    <div>
                        <p className="hoa-card-kicker">Service Provider *Industry Exclusive</p>

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
                        {!providerSaved || !stripeClientReferenceId ? (
                            <button
                                type="submit"
                                className="stripe-button"
                                disabled={!providerFormComplete || providerSaving}
                            >
                                {providerSaving ? "Saving..." : "Save Info & Continue"}
                            </button>
                        ) : (
                            React.createElement("stripe-buy-button", {
                                key: stripeClientReferenceId,
                                "buy-button-id": "buy_btn_1Tc9gOLVTbVnCRoaBvGtFJ4K",
                                "publishable-key": "pk_live_4s4TtIY6HXHbiKpHOoFGvQRf",
                            })
                        )}
                    </div>
                </form>
            </div>
        </section>
    );
};

export default HOAPartySignup;