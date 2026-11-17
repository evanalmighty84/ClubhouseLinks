"use strict";

/**
 * Optional house-photo acquisition for Clubhouse Links.
 *
 * The vendor's API must return an EXACT ADDRESS MATCH and must separately
 * license copying to Cloudinary and displaying the photo in both mobile apps.
 * Apple Look Around and Google Street View imagery must never be passed here.
 *
 * Provider contract, POST JSON {address,latitude,longitude,resident_id}:
 * {
 *   "image_url": "https://images.your-licensed-provider.example/path.jpg",
 *   "matched_address": "exact resident address",
 *   "storage_permitted": true,
 *   "redistribution_permitted": true,
 *   "provider": "Your Licensed Provider",
 *   "attribution": "Photograph © ... (if required)"
 * }
 */
const pool = require("../db/db");
const cloudinary = require("cloudinary").v2;

const normalizeAddress = value =>
    String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const isConfigured = () =>
    Boolean(process.env.HOUSE_IMAGE_PROVIDER_ENDPOINT &&
        process.env.HOUSE_IMAGE_PROVIDER_API_KEY &&
        process.env.HOUSE_IMAGE_PROVIDER_IMAGE_HOST &&
        process.env.HOUSE_IMAGE_PROVIDER_LICENSE_CONFIRMED === "true");

function providerSettings() {
    if (!isConfigured()) return null;
    const endpoint = new URL(process.env.HOUSE_IMAGE_PROVIDER_ENDPOINT);
    const approvedHost = String(process.env.HOUSE_IMAGE_PROVIDER_IMAGE_HOST)
        .trim().toLowerCase();
    // Reject insecure, private-network and non-HTTPS provider targets.
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
        !endpoint.hostname || endpoint.hostname === "localhost" ||
        /^\d+\.\d+\.\d+\.\d+$/.test(endpoint.hostname) ||
        !approvedHost || approvedHost.includes("/") || approvedHost.includes(":")) {
        throw new Error("Invalid house image provider configuration");
    }
    return {endpoint, approvedHost};
}

async function acquireLicensedHousePhoto(residentId) {
    const settings = providerSettings();
    if (!settings) return {status: "not_configured"};

    const result = await pool.query(
        `SELECT id, address, latitude, longitude, house_image_consent,
                house_image_url
         FROM hoa_residents WHERE id = $1`, [residentId]
    );
    const resident = result.rows[0];
    if (!resident) return {status: "resident_not_found"};
    if (!resident.house_image_consent || !resident.address?.trim())
        return {status: "consent_or_address_missing"};
    if (resident.house_image_url) return {status: "already_saved"};

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
        response = await fetch(settings.endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.HOUSE_IMAGE_PROVIDER_API_KEY}`
            },
            body: JSON.stringify({
                address: resident.address,
                latitude: resident.latitude,
                longitude: resident.longitude,
                resident_id: resident.id
            }),
            redirect: "error",
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeout);
    }
    if (response.status === 404 || response.status === 204)
        return {status: "no_match"};
    if (!response.ok) throw new Error(`Licensed photo provider HTTP ${response.status}`);

    const json = await response.json();
    if (!json || json.storage_permitted !== true ||
        json.redistribution_permitted !== true ||
        normalizeAddress(json.matched_address) !== normalizeAddress(resident.address)) {
        return {status: "license_or_address_mismatch"};
    }
    const image = new URL(String(json.image_url || ""));
    if (image.protocol !== "https:" ||
        image.hostname.toLowerCase() !== settings.approvedHost ||
        image.username || image.password) {
        return {status: "unapproved_image_host"};
    }
    // Cloudinary performs the actual import. Only explicitly authorized image
    // hosts can be used; the provider must grant hosting/redistribution rights.
    const upload = await cloudinary.uploader.upload(image.toString(), {
        folder: "clubhouse_resident_house_images",
        resource_type: "image",
        overwrite: false
    });
    if (!upload.secure_url || !upload.secure_url.startsWith("https://res.cloudinary.com/"))
        throw new Error("Cloudinary did not return a valid HTTPS image URL");

    const saved = await pool.query(
        `UPDATE hoa_residents
         SET house_image_url = $2,
             house_image_source = 'licensed_provider',
             house_image_address = address,
             house_image_updated_at = NOW(),
             house_image_provider = $3,
             house_image_attribution = $4
         WHERE id = $1 AND house_image_consent = TRUE
           AND address = $5
           AND NULLIF(TRIM(house_image_url), '') IS NULL
         RETURNING id, house_image_url`,
        [
            resident.id, upload.secure_url,
            String(json.provider || "Licensed property imagery").slice(0,160),
            String(json.attribution || "").slice(0,500) || null,
            resident.address
        ]
    );
    if (!saved.rowCount) {
        // Address or consent may have changed during photo acquisition.
        await cloudinary.uploader.destroy(upload.public_id).catch(() => {});
        return {status: "profile_changed"};
    }
    return {status: "saved", image_url: upload.secure_url};
}

module.exports = {acquireLicensedHousePhoto, isConfigured};
