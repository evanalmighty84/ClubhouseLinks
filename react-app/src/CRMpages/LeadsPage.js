import React from 'react';
import RFPBids from "../CRMcomponents/RFPBids";
import NextDoorLeads from "../CRMcomponents/NextDoorLeads";
import HotNextDoorLeads from "../CRMcomponents/HotNextDoorLeads";
import LeadsSentDashboard from "./LeadsSentDashboard";





const LeadsPage = () => {
    return (
        <>
            <LeadsSentDashboard/>
    <HotNextDoorLeads/>,
            <RFPBids/>
            </>
    );
};

export default LeadsPage;
