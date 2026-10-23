-- La roue du jour (fidélité) : un tour crédité est une ligne de la carte à
-- part entière. Seule dans son fichier : une valeur d'enum ne sert pas dans
-- la transaction qui la crée (20261023000002 l'emploie).

alter type public.loyalty_entry_kind add value 'roue';
