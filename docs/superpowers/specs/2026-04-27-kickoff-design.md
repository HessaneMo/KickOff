# KickOff — Design Spec
**Date:** 2026-04-27  
**Statut:** Approuvé par l'utilisateur

---

## 1. Vision produit

Plateforme web mobile-first de gestion de tournois de football amateur. Organisateur crée un tournoi, invite des équipes via QR code / code court / lien, les joueurs s'inscrivent, un encodeur encode les scores, tout le monde suit en temps réel.

**Tagline:** Organise ton tournoi en 5 minutes.

---

## 2. Utilisateurs & Rôles

| Rôle | Description | Permissions |
|------|-------------|-------------|
| **Organisateur** | Crée le tournoi, gère tout | Tout |
| **Co-organisateur** | Assigné par l'organisateur | Même droits que organisateur |
| **Encodeur** | Encode les scores uniquement | Accès écran encodage score |
| **Joueur (avec compte)** | Historique stats persistant entre tournois | Voir tournoi, équipe, stats perso |
| **Joueur (sans compte)** | Rejoint via QR/code, anonyme | Voir tournoi, équipe |

Un joueur peut cumuler les rôles (ex: Joueur + Encodeur).

### Statuts joueur dans une équipe
- **Titulaire** — dans le 11 de départ
- **Remplaçant** — sur le banc

L'organisateur peut changer le statut et les rôles à tout moment.

---

## 3. Rejoindre un tournoi / équipe

Trois méthodes simultanées sur le même écran d'invitation :
1. **QR code** — scan direct sur terrain
2. **Code court** — format `DIAB-4829`, entré sur le site
3. **Lien copiable** — partage WhatsApp / Discord

---

## 4. Formats de tournoi

Organisateur choisit lors de la création :
- Taille équipe : 5v5 → 11v11
- Format : Poules uniquement / Élimination directe / Poules + phase finale
- Visibilité : Public (visible par tous) ou Privé (accès via invitation uniquement)

---

## 5. Stats joueurs

| Plan | Stats disponibles |
|------|-------------------|
| Free | Aucune |
| Pro | Buts, assists, clean sheets, win rate, forme récente, classement buteurs |
| Club | Tout Pro + comparaison joueurs, meilleur joueur du tournoi, export |

### Postes joueurs
Chaque joueur déclare son poste (gardien, défenseur central, défenseur latéral droit/gauche, milieu défensif, milieu central, ailier gauche/droit, attaquant centre).

Une équipe peut afficher les postes recherchés → visibles par tous les joueurs du tournoi.

---

## 6. Notifications

- **Push browser** — priorité haute, alertes temps réel via Web Push API + Supabase Realtime pour classement live (résultat encodé, match à venir, nouveau joueur)
- **Email** — backup, résumés

---

## 7. Anti-abus & Auth

- Inscription : email vérifié obligatoire
- Anti multi-comptes : device fingerprint (FingerprintJS, 20k/mois gratuit) — si fingerprint déjà lié à un compte, inscription bloquée avec message "Un compte existe déjà depuis cet appareil"
- Vérification téléphone : ajoutée quand revenus suffisants (Twilio ~€0.07/SMS)

---

## 8. Monétisation

### Trial
14 jours Pro gratuit à l'inscription. Pas de CB requise. Rappel email J-7 et J-1.

### Plans

| Plan | Prix | Limites |
|------|------|---------|
| **Free** | 0€ | 1 tournoi actif, max 4 équipes, watermark "Powered by KickOff", pas de stats |
| **Pro** | 9€/mois | Tournois illimités, équipes illimitées, stats complètes, notifs, sans watermark |
| **Club** | 19€/mois | Tout Pro + branding custom (logo/couleurs club), export données, support prioritaire |

---

## 9. Design System

### Typographie
**Chakra Petch** — police principale (titres + corps). Angulaire, tech, caractère fort.

### Couleurs (dark mode par défaut)

| Token | Valeur | Usage |
|-------|--------|-------|
| `bg-app` | `#111827` | Background app |
| `bg-card` | `#1f2937` | Cartes / items |
| `bg-hero` | `#f9fafb` | Hero blanc sur dark |
| `text-primary` | `#f9fafb` | Texte principal dark |
| `text-hero` | `#0f172a` | Texte sur hero blanc |
| `text-muted` | `#4b5563` | Texte secondaire |
| `accent-green` | `#4ade80` / `#14532d` | Actions positives, ouvert |
| `accent-red` | `#dc2626` | LIVE, erreurs |
| `accent-blue` | `#60a5fa` / `#1e3a5f` | Capitaine, infos |
| `neutral` | `#e5e7eb` / `#374151` | Tags neutres (cherche) |
| `border` | `#1f2937` | Séparateurs |

### Toggle dark/light
Bouton dans navbar (icône soleil en dark → clique → light, icône lune en light → clique → dark). Le hero s'inverse : blanc sur dark / dark sur blanc.

### Navigation
**Floating pill nav** — capsule centrée flottante en bas. Items : Tournois / Stats / Notifs / Profil. Item actif = fond blanc, texte noir.

---

## 10. Écrans principaux

### Dashboard (accueil organisateur)
- Navbar : logo gauche, toggle dark/light + avatar droite
- Hero : tournoi actif le plus récent (fond blanc, titre bold, stats 4 colonnes, barre progression)
- Sections : Classement groupe, Dernier résultat, Top buteurs, Mes tournois, Activité récente
- Floating pill nav en bas

### Page Tournoi
- Topbar : bouton retour + titre + bouton partage
- Hero identique dashboard
- Tabs : Classement / Matchs / Équipes / Stats
- Classement avec colonnes J/G/P/Pts + indicateurs forme (pastilles vertes/rouges)
- Prochain match (bordure gauche bleue)
- Dernier résultat avec noms buteurs
- Grid équipes 2 colonnes avec initiales joueurs

### Page Équipe
- Hero : badge équipe (initiales) + nom + classement actuel + stats (V/Buts/Encaissés/Pts)
- Forme récente : pastilles V/N/D
- Bouton "Inviter un joueur" — pleine largeur, vert foncé + texte vert
- Liste joueurs : avatar, nom, poste, badge rôle (Cap. / Encodeur / Remplaçant), stat buts
- Section "Postes recherchés" — tags blanc/neutre
- Bloc invitation : QR code + code court + bouton Partager

### Encodage Score (Encodeur uniquement)
- Header match : noms équipes + score actuel + infos match
- Contrôles score : deux blocs côte à côte, boutons − et + par équipe
- Liste buteurs avec compteur + bouton "Ajouter un buteur"
- Bouton "Valider le score" pleine largeur blanc
- Note sous le bouton : "Les joueurs seront notifiés automatiquement"

---

## 11. Stack technique

- **Frontend** : Next.js App Router + TypeScript + Tailwind CSS
- **Auth** : Supabase Auth (email + device fingerprint)
- **DB** : Supabase PostgreSQL
- **Notifs push** : Web Push API
- **Email** : Resend (3000/mois gratuit)
- **Paiement** : Stripe
- **Deploy** : Vercel
- **Fingerprint** : FingerprintJS (free tier 20k/mois)

---

## 12. MVP scope

Pour la v1 :
- Création tournoi (poules uniquement en premier)
- Invitation équipes (QR + code + lien)
- Encodage scores
- Classement temps réel
- Notifs push
- Auth email
- Plans Free + Pro (pas Club en v1)

Hors MVP v1 :
- Dark/light toggle (peut attendre)
- Stats avancées Pro (partiellement)
- Plan Club
- App mobile native
