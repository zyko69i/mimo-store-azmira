# MiMo Store Azmira

Studio de revente multi-plateformes (Vinted, Leboncoin, Facebook Marketplace et vitrine en ligne), inspiré du concept AZMIRA et poussé plus loin.

## Fonctionnalités

- **Tableau de bord** : CA et bénéfice du mois, valeur du stock, ventes des 6 derniers mois, plateformes qui vendent le mieux, colis à préparer, articles qui traînent avec baisse de prix suggérée.
- **Stock** : fiches article complètes (jusqu'à 6 photos avec rotation, catégories, état, prix d'achat / affiché / plancher, emplacement, SKU), marge en direct, repère de prix hors-ligne et estimation IA, historique des prix, étiquette QR imprimable, duplication.
- **Annonces** : texte prêt à coller adapté à chaque plateforme, avec la phrase de fin sur les lots (jamais en double), amélioration par l'assistante Mira, copie en un clic, « Marquer en ligne ».
- **Ventes & envois** : suivi À envoyer → Envoyé → Livré → Payé, délai de 5 jours ouvrés (week-ends et jours fériés français exclus), alertes de retard, numéro de suivi, frais de port, net et bénéfice.
- **Clients** : carnet d'acheteurs, historique d'achats, total dépensé.
- **Comptabilité micro-entreprise** : tableau mensuel, dépenses, cotisations URSSAF estimées (12,3 %, versement libératoire 1 % en option), suivi du seuil de 203 100 €, export CSV du livre des recettes. Repères : [cotisations](https://entreprendre.service-public.gouv.fr/vosdroits/F37353), [seuils](https://entreprendre.service-public.gouv.fr/vosdroits/F36232).
- **Vitrine en ligne** (`/#/boutique`) : boutique publique avec filtres, fiche produit, panier et commande par WhatsApp ou e-mail.
- **Mira** : assistante qui connaît le stock, les ventes et les envois. Sans clé IA, elle répond en mode hors-ligne (bilan, colis, articles qui traînent, annonces à publier).
- **Réglages** : boutique, frais par plateforme, règles (délai, marge minimale, baisse suggérée), sauvegarde/restauration JSON, données de démo.

Les données sont enregistrées dans le navigateur (IndexedDB). Pense à exporter une sauvegarde régulièrement.

## Stack

Vite, React 18, TypeScript, Tailwind CSS, fonctions serverless Vercel (`api/`), Vercel Blob pour la vitrine.

## Déploiement sur Vercel

1. Sur [vercel.com/new](https://vercel.com/new), importe le dépôt GitHub `mimo-store-azmira` (preset Vite détecté automatiquement).
2. Déploie. L'application fonctionne déjà entièrement (hors IA et vitrine publique partagée).

### Variables d'environnement (facultatives)

| Variable | Rôle |
| --- | --- |
| `AGNES_API_KEY`, `GROQ_API_KEY` ou `OPENAI_API_KEY` | Active l'assistante Mira (une seule suffit, testées dans cet ordre). |
| `AI_GATEWAY_API_KEY` | Alternative : Vercel AI Gateway (ou OIDC automatique si l'AI Gateway est activé sur le projet). |
| `BLOB_READ_WRITE_TOKEN` | Ajouté automatiquement quand tu crées un store Blob (Storage → Create → Blob → Connect au projet). Active la vitrine publique. |
| `MIMO_BLOB_ACCESS` | Mettre `public` si le store Blob est public (par défaut : privé). |

Après avoir ajouté une variable, redéploie le projet.

## Développement local

```bash
npm install
npm run dev
```

Les routes `/api` ne tournent qu'avec `vercel dev` ; sans elles, l'application bascule sur ses modes hors-ligne.
