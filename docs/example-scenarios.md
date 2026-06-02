# Example scenarios

These are the three guiding **exploratory, what-if** questions the challenge brief expects every team to be able to engage with on the working assistant. Use them as a starting point and as a sanity check that your prototype combines at least two data themes for the Must criterion in [CHALLENGE.md](../CHALLENGE.md).

## 1. Verzilting shock on the Hollandse IJssel intake

> *Wat is de impact op de drinkwaterproductie als de Hollandse IJssel door verzilting zes weken niet bruikbaar is als innamepunt?*

Touches: `drinkwaterzekerheid` (intake points, production chain, drinkwaterbedrijven, six-hour zones), `gebiedsviewer/verzilting`, possibly `gebiedsviewer/overstromingen_kwetsbaarheid_panden_na_dijkdoorbraak` for downstream effects.

## 2. Combined climate and population pressure

> *Welke combinatie van klimaatdruk en bevolkingsgroei brengt de leveringszekerheid het eerst in gevaar?*

Touches: `drinkwaterzekerheid`, `gebiedsviewer` (verzilting, bodemdaling, daling bij ontwateringsdiepte, veenoxidatie, stabiliteit), `extra_data/CBS` vierkantstatistieken 2018 through 2023 for population growth.

## 3. Opportunities in the intrekgebied

> *Waar liggen de kansen: welke ingrepen in intrekgebieden vergroten de robuustheid het meest?*

Touches: `drinkwaterzekerheid` (six-hour zones, productieketen, toestandsbeoordeling), `gebiedsviewer` (groenblauwe ruimte, natuurnetwerk, nutriënten verontreinigde gebieden, natuurlijke spons kansrijk), and optionally `extra_data/lgn` for land-use shifts (LGN now lives under `extra_data/` and is opt-in).

---

## Additional drinkwater-specific scenarios

The three scenarios below are **drafts** put together by the GovTech NL hackathon prep team while waiting on Sebastiaan, Tim and Thijs to deliver the authoritative list. Treat them as placeholders, not as canonical brief questions; expect them to be replaced or sharpened before 4 June.

### A. Bescherming van intrekgebieden onder ruimtelijke druk

> *Welke intrekgebieden in Zuid-Holland staan in 2040 het meest onder druk door ruimtelijke ontwikkelingen, en welke beschermingsmaatregelen leveren het meeste effect op?*

Touches: `drinkwaterzekerheid` (zes-uur-zones, intrekgebieden, productieketen), `gebiedsviewer` (natuurnetwerk, groenblauwe ruimte, nutriënten verontreinigde gebieden, stabiliteit), `extra_data/woondeals` (PMIEK-projecten, capaciteitskaart) for spatial-planning pressure.

### B. Klimaat-resilientie van het oppervlaktewater

> *Hoe verandert de toestandsbeoordeling van oppervlaktewaterlichamen die als drinkwaterbron dienen onder een gecombineerd droogte- en verziltingsscenario, en welke regio's verliezen daarmee het eerst hun bruikbaarheid als bron?*

Touches: `drinkwaterzekerheid` (toestandsbeoordeling oppervlaktewaterlichamen, drinkwaterbedrijven, productieketen), `gebiedsviewer` (verzilting, veenoxidatie, daling bij ontwateringsdiepte, overstromingskwetsbaarheid).

### C. Stikstof- en nutriëntendruk op grondwaterbronnen

> *Welke grondwaterbronnen voor drinkwater liggen in gebieden met de grootste stikstof- en nutriëntendruk, en hoe verhoudt dat zich tot bestaande beschermingsmaatregelen?*

Touches: `drinkwaterzekerheid` (drinkwater_infrastructuur, zes-uur-zones), `gebiedsviewer` (nutriënten verontreinigde gebieden, natuurnetwerk, natura 2000-gebieden), `extra_data/woondeals` (stikstof_natura2000_stats, stikstof_overschrijding_kdw).

> _TODO (Sebastiaan Schmidt, Tim Padmos, Thijs Raterink): replace or refine the three drafts above with the authoritative list. The brief promises that more drinkwater-specific scenarios and example questions will be supplied by the challenge owners._

## How to use these scenarios

- Pick **one** scenario as the spine of your prototype.
- Show the **reasoning chain** in the Insight panel and in MLflow at [http://localhost:5001](http://localhost:5001).
- For the Should criterion, demo a **second** scenario (or a comparison such as "with vs without verzilting shock") on the same prototype.
- Be explicit about **assumptions, data gaps, and the time horizon** (2025 baseline vs 2040 projection). The brief rewards a prototype that surfaces uncertainty rather than hiding it.
