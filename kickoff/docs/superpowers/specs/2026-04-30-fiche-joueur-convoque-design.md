# Fiche Joueur Convoqué — Design Spec
Date: 2026-04-30

## Résumé

Onglet "Convo." dans TournamentPage affichant la liste des joueurs convoqués pour le prochain match d'une équipe, avec fiche accordion par joueur. Visible uniquement par les membres de l'équipe et l'organisateur.

---

## Fonctionnement

### Convocation automatique
Tous les membres d'une équipe (`tournament_members` avec `team_id` non null) sont automatiquement convoqués pour chaque match de leur équipe. Pas de sélection manuelle.

### Visibilité
- **Joueur** : voit l'onglet "Convo." seulement si son équipe joue un match (i.e. il est membre d'une équipe dans ce tournoi)
- **Organisateur** : voit l'onglet et toutes les fiches des 2 équipes pour chaque match
- **Joueur sans équipe / visiteur** : onglet masqué

---

## UI — Onglet "Convo."

### Placement
5e onglet dans le `PillNav` de `TournamentPage`, après Classement / Matchs / Équipes / Invitation.
Label : `Convo.`

### Contenu de l'onglet

**Section "Prochain match"**
- Affiche le prochain match non terminé impliquant l'équipe du joueur
- Header : date + heure si disponible, noms des 2 équipes
- Si aucun match à venir : message "Aucun match à venir"

**Liste des joueurs convoqués (accordion)**
- Tous les `tournament_members` de l'équipe du joueur pour ce match
- Chaque row = un joueur, cliquable pour expand
- Row fermée : avatar initiales · nom · poste · badge Tit./Rem. · chevron
- Row ouverte (Design C approuvé) : stats inline en grille 3 colonnes

**Grille stats (row expanded)**
| Matchs joués | Buts | Assists |
|---|---|---|
| nb matchs dans ce tournoi | nb buts | nb assists |

Stats calculées depuis la table `goals` (ou via agrégat sur `matches` finished).

**Vue organisateur**
L'organisateur voit les 2 équipes séparément avec leur liste respective de joueurs convoqués.

---

## Architecture

### Nouveau composant
`src/components/ConvocationTab.tsx`

Props :
```ts
interface ConvocationTabProps {
  tournamentId: string;
  userId: string;
  isOrganizer: boolean;
}
```

### Données requises
1. `tournament_members` — membres de l'équipe du joueur (ou des 2 équipes pour l'orga)
2. `matches` — prochain match non terminé impliquant l'équipe
3. `goals` — pour calculer buts et assists par joueur dans le tournoi
4. `profiles` — username des joueurs

### Requêtes Supabase
- Récupérer équipe du joueur : `tournament_members.team_id` where `user_id = me`
- Prochain match : `matches` where `(home_team_id = team OR away_team_id = team) AND status != 'finished'` order by `scheduled_at asc` limit 1
- Membres convoqués : `tournament_members` where `team_id = team` join `profiles`
- Stats joueur : agrégat sur `goals` where `tournament_id = x` group by `scorer_id` / `assist_id`

### Pas de nouveau modèle DB
Aucune migration nécessaire. Convocation = dérivée des données existantes.

---

## États UI

| État | Affichage |
|---|---|
| Loading | Skeleton |
| Joueur sans équipe | Onglet masqué |
| Aucun match à venir | Message "Aucun match programmé" |
| Match trouvé | Header match + liste accordion |
| Row fermée | Nom · poste · badge statut · chevron › |
| Row ouverte | Stats 3 colonnes (Matchs / Buts / Assists) |

---

## Hors scope (MVP)

- Notifications push de convocation
- Historique des convocations passées
- Modification du statut tit./rem. depuis cet onglet (déjà dans `/team`)
- Stats avancées (passes, tirs, cartons)
