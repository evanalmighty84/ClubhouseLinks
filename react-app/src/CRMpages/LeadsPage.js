import React from 'react';
import RFPBids from "../CRMcomponents/RFPBids";
import NextDoorLeads from "../CRMcomponents/NextDoorLeads";
import HotNextDoorLeads from "../CRMcomponents/HotNextDoorLeads";





const LeadsPage = () => {
    return (
        <>
    <HotNextDoorLeads/>,
        <NextDoorLeads/>,
            <RFPBids/>
            </>
    );
};

export default LeadsPage;
