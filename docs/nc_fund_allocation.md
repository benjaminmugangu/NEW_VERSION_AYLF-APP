# 💰 Allocation de Fonds par le NC (National Coordinator)

## 📋 Réponse à Votre Question

**"À quel niveau le NC alloue des fonds aux sites ?"**

Le **National Coordinator (NC)** alloue des fonds aux **Sites** via le module **Fund Allocations**.

---

## 🎯 Processus d'Allocation de Fonds

### Navigation
1. Le NC se connecte au dashboard
2. Va dans **Finances** → **Allocations** (ou `/dashboard/financials/allocations`)
3. Clique sur **"New Allocation"**

### Formulaire d'Allocation
Le NC remplit les informations suivantes :

```typescript
{
  amount: number,           // Montant à allouer
  purpose: string,          // Objectif (ex: "Activités Sociales 2025")
  allocationDate: Date,     // Date d'allocation
  siteId: string,          // ID du site bénéficiaire
  status: "pending" | "approved" | "rejected"
}
```

### Niveaux d'Allocation

| De (Source) | Vers (Destination) | Via le Module |
|-------------|-------------------|---------------|
| **National** → **Site** | ✅ Oui | Fund Allocations |
| **Site** → **Small Group** | ✅ Oui | Fund Allocations (SC) |
| **National** → **Small Group** | ❌ Non | Indirectement via Site |

---

## 🔐 Permissions et Workflow

### 1. National Coordinator (NC)
- **Peut** : Créer des allocations pour n'importe quel Site
- **Voit** : Toutes les allocations (National, Site, Small Groups)
- **Approuve** : Les requêtes d'allocation des Sites (si workflow activé)

### 2. Site Coordinator (SC)
- **Peut** : Créer des allocations pour ses Small Groups uniquement
- **Voit** : Les allocations de son site et de ses groupes
- **Ne peut pas** : Créer des allocations au niveau national

### 3. Small Group Leader (SGL)
- **Peut** : Voir les allocations de son groupe
- **Ne peut pas** : Créer d'allocations

---

## 💻 Exemple Code (Service)

Voici comment le backend gère les allocations :

```typescript
// src/services/fundAllocationService.ts (simplifié)

export async function createAllocation(data: AllocationFormData) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  
  if (!user) throw new Error("Unauthorized");
  
  const profile = await prisma.profile.findUnique({ 
    where: { id: user.id } 
  });
  
  // Vérification des permissions
  if (profile.role === 'NATIONAL_COORDINATOR') {
    // NC peut allouer à n'importe quel site
    return await prisma.fundAllocation.create({
      data: {
        amount: data.amount,
        purpose: data.purpose,
        allocationDate: new Date(data.allocationDate),
        siteId: data.siteId,  // ✅ NC choisit le site
        status: data.status || 'approved',
        allocatedBy: user.id
      }
    });
  } else if (profile.role === 'SITE_COORDINATOR') {
    // SC peut allouer seulement à ses groupes
    if (data.siteId !== profile.siteId) {
      throw new Error("Forbidden: Cannot allocate to other sites");
    }
    
    return await prisma.fundAllocation.create({
      data: {
        amount: data.amount,
        purpose: data.purpose,
        allocationDate: new Date(data.allocationDate),
        siteId: profile.siteId,  // ✅ Site verrouillé au sien
        smallGroupId: data.smallGroupId,
        status: 'pending',  // Nécessite approbation
        allocatedBy: user.id
      }
    });
  } else {
    throw new Error("Forbidden: Only NC and SC can create allocations");
  }
}
```

---

## 📊 Dashboard Financier

Le NC voit un résumé financier global :

- **Total Alloué** : Somme de toutes les allocations
- **Par Site** : Détail des allocations par site
- **Statut** : Pending, Approved, Rejected

---

## 🔍 RLS (Row Level Security)

Les politiques SQL garantissent que :

```sql
-- National Coordinator : Voit tout
SELECT * FROM fund_allocations;

-- Site Coordinator : Voit seulement son site
SELECT * FROM fund_allocations WHERE site_id = current_user_site_id;

-- Small Group Leader : Voit seulement son groupe
SELECT * FROM fund_allocations WHERE small_group_id = current_user_group_id;
```

---

## ✅ Résumé

**Le NC alloue des fonds aux SITES**, pas directement aux petits groupes.  
Les Sites redistribuent ensuite aux Small Groups si nécessaire.

**Hiérarchie** :  
`National (NC) → Site (SC) → Small Group (SGL)`
