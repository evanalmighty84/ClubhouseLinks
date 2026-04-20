import React from 'react';
import RFPBids from "../CRMcomponents/RFPBids";
import NextDoorLeads from "../CRMcomponents/NextDoorLeads";
import SentLeads from "../CRMcomponents/HotNextDoorLeads2.0";
import LeadsSentDashboard from "./LeadsSentDashboard";

const LeadsPage = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const isAdmin8 = user?.id === 8;

    return (
        <>
            <LeadsSentDashboard />
            <SentLeads />

            {/* Only show RFPBids if user.id === 8 */}
            {isAdmin8 && <RFPBids />}
        </>
    );
};

export default LeadsPage;
