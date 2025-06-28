"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/constants';
import { NewTransactionForm } from './NewTransactionForm';
import { mockSites } from '@/lib/mockData';

export const NewTransactionModal = () => {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;

  // Le bouton ne s'affiche que pour les rôles autorisés à créer des transferts
  const canCreateTransaction =
    currentUser.role === ROLES.NATIONAL_COORDINATOR ||
    currentUser.role === ROLES.SITE_COORDINATOR;

  if (!canCreateTransaction) {
    return null;
  }

  const handleSuccess = () => {
    // Idéalement, on rafraîchirait les données ici.
    console.log("Transaction réussie, fermeture du modal.");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nouveau Transfert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Créer un Nouveau Transfert</DialogTitle>
          <DialogDescription>
            {currentUser.role === ROLES.NATIONAL_COORDINATOR && "Transférez des fonds du bureau national vers un site spécifique."}
            {currentUser.role === ROLES.SITE_COORDINATOR && `Transférez des fonds depuis ${mockSites.find(s => s.id === currentUser.siteId)?.name || 'votre site'} vers un petit groupe.`}
          </DialogDescription>
        </DialogHeader>
        <NewTransactionForm currentUser={currentUser} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
};
