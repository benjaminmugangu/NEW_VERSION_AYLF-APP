"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ROLES } from "@/lib/constants";
import { mockSites, mockSmallGroups } from "@/lib/mockData";
import type { User } from "@/lib/types";

// Le schéma de validation change en fonction du rôle de l'utilisateur
const createFormSchema = (role: string) => {
    const schema = z.object({
        amount: z.coerce.number().positive("Le montant doit être positif."),
        description: z.string().min(5, "La description doit contenir au moins 5 caractères.").max(100),
        recipientEntityId: z.string().optional(),
    });

    if (role === ROLES.NATIONAL_COORDINATOR) {
        return schema.refine(data => !!data.recipientEntityId && data.recipientEntityId.length > 0, {
            message: "Vous devez sélectionner un site.",
            path: ["recipientEntityId"],
        });
    }
    
    if (role === ROLES.SITE_COORDINATOR) {
        return schema.refine(data => !!data.recipientEntityId && data.recipientEntityId.length > 0, {
            message: "Vous devez sélectionner un groupe.",
            path: ["recipientEntityId"],
        });
    }

    return schema;
};


interface NewTransactionFormProps {
    currentUser: User;
    onSuccess: () => void;
}

export const NewTransactionForm = ({ currentUser, onSuccess }: NewTransactionFormProps) => {
    const formSchema = createFormSchema(currentUser.role);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: 0,
            description: "",
            recipientEntityId: "",
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        // Dans une application réelle, on appellerait une API ici.
        console.log("Données du formulaire soumises:", {
            ...values,
            senderEntityType: currentUser.role === ROLES.NATIONAL_COORDINATOR ? 'national' : 'site',
            senderEntityId: currentUser.role === ROLES.NATIONAL_COORDINATOR ? 'national_office' : currentUser.siteId,
            transactionType: 'transfer'
        });
        alert("Transaction (fictive) créée avec succès !");
        onSuccess();
    }

    const renderRecipientSelector = () => {
        if (currentUser.role === ROLES.NATIONAL_COORDINATOR) {
            return (
                <FormField
                    control={form.control}
                    name="recipientEntityId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Site Bénéficiaire</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un site..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {mockSites.map(site => (
                                        <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            );
        }
        if (currentUser.role === ROLES.SITE_COORDINATOR) {
            const availableGroups = mockSmallGroups.filter(sg => sg.siteId === currentUser.siteId);
            return (
                 <FormField
                    control={form.control}
                    name="recipientEntityId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Groupe Bénéficiaire</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un groupe..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {availableGroups.map(group => (
                                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )
        }
        return null;
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {renderRecipientSelector()}

                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Montant</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Ex: Allocation budgétaire mensuelle" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">Soumettre le Transfert</Button>
            </form>
        </Form>
    );
};
