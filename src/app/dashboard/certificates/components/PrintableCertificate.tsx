// src/app/dashboard/certificates/components/PrintableCertificate.tsx
"use client";

import React from "react";
import type { User } from "@/lib/types";
import { ROLES } from "@/lib/constants";
import Image from "next/image";
import { format } from "date-fns";

interface PrintableCertificateProps {
  user: User;
  entityName: string;
  appName: string;
}

export function PrintableCertificate({ user, entityName, appName }: PrintableCertificateProps) {
  
  const getRoleDescription = () => {
    let roleDesc = "";
    if (user.role === ROLES.SITE_COORDINATOR) {
      roleDesc = `Site Coordinator of ${entityName}`;
    } else if (user.role === ROLES.SMALL_GROUP_LEADER) {
      roleDesc = `Small Group Leader for ${entityName}`;
    } else {
      roleDesc = user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return roleDesc;
  };

  const mandatePeriod = () => {
    if (!user.mandateStartDate) return "N/A";
    const start = format(new Date(user.mandateStartDate), "MMMM d, yyyy");
    const end = user.mandateEndDate ? format(new Date(user.mandateEndDate), "MMMM d, yyyy") : "Present";
    return `${start} - ${end}`;
  };

  return (
    // The #certificate-content ID is targeted by the print function in the parent page
    <div id="certificate-content" className="p-4 md:p-8 font-serif bg-background text-foreground">
      {/* This inner div is what will actually be styled for A4 printing */}
      <div className="certificate-container mx-auto border-4 border-primary p-6 md:p-10 text-center relative shadow-lg">
        {/* Watermark Image - Layer 1 */}
        <Image
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROsJ0oRg8RYoAuUWm025MBmI5tjiHUI-Pcgw&s"
          alt="AYLF Watermark"
          fill
          style={{ objectFit: 'contain' }}
          className="z-0"
        />
        {/* Translucent Overlay - Layer 2 */}
        <div className="absolute inset-0 bg-background/90 z-10"></div>

        {/* Content - Layer 3 */}
        <div className="relative z-20 flex flex-col h-full">
          <div className="flex justify-center my-4 md:my-6">
            <Image 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROsJ0oRg8RYoAuUWm025MBmI5tjiHUI-Pcgw&s"
              alt={`${appName} Logo`} 
              width={100} 
              height={100} 
              className="rounded-full logo"
              data-ai-hint="organization logo"
            />
          </div>

          <h1 className="title text-2xl md:text-3xl font-bold text-primary mb-1 md:mb-2">
            Certificate of Service
          </h1>
          <h2 className="subtitle text-lg md:text-xl text-muted-foreground mb-4 md:mb-6">
            Awarded by {appName}
          </h2>

          <p className="presented-to text-md md:text-lg mb-1">This certificate is proudly presented to</p>
          <p className="user-name text-xl md:text-2xl font-bold text-foreground mb-3 md:mb-4">
            {user.name}
          </p>

          <p className="service-as text-sm md:text-md mb-0.5">For their dedicated service and outstanding contributions as</p>
          <p className="role-entity text-md md:text-lg font-semibold text-primary/90 mb-2 md:mb-3">
            {getRoleDescription()}
          </p>

          <p className="period text-sm md:text-md mb-6 md:mb-8">
            During the period: {mandatePeriod()}
          </p>

          <div className="signatures mt-auto pt-6 md:pt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-end">
            <div>
              <div className="signature-line w-3/4 md:w-4/5 h-px bg-foreground mx-auto mb-1"></div>
              <p className="signature-title text-xs md:text-sm text-muted-foreground">National Coordinator Signature</p>
            </div>
            <div>
              <div className="signature-line w-3/4 md:w-4/5 h-px bg-foreground mx-auto mb-1"></div>
              <p className="signature-title text-xs md:text-sm text-muted-foreground">Date Issued: {format(new Date(), "MMMM d, yyyy")}</p>
            </div>
          </div>
          <p className="footer-text text-xs text-muted-foreground mt-6 md:mt-8">This certificate acknowledges the valuable role and commitment demonstrated by the recipient in furthering the mission of {appName}.</p>
        </div>
      </div>
    </div>
  );
}

